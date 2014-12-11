# encoding: utf-8
# Encoding.default_external = Encoding::UTF_8 

# Weathermap.rb
#
# Ce script lit le fichier de description des équipements.
# Il produit un tableau hosts d'équipement à monitorer (ceux qui ont une adresse ip) et un tableau graph d'équipements à dessiner qui peuvent être plus nombreux.
# Le tableau des équipements à dessiner est écrit dans un fichier JSON publié par le serveur web pour le client.
# Une boucle infinie procède ensuite à intervalle régulier refresh_rate à la collecte des données SNMP sur tous les équipements à monitorer.
# Seules deux mesures consécutives sont conservées pour calculer des différences (inOctects par exemple).
# Une fois le calcul effectué pour chaque équipement, les résultats sont écrits dans un fichier JSON publié par le serveur web que le client pourra lire.

require 'yaml'
require 'json'
require 'snmp'
include SNMP

file_conf_yaml = './conf.yml'


#### Refactoring en classes

# classe Host :
# représente un équipement à monitorer
class Host
    # variables de classe
    @@oid_ifnames = "1.3.6.1.2.1.31.1.1.1.1"
    @@oid_ifdescr = "1.3.6.1.2.1.2.2.1.2"
    @@oid_ifspeed = "1.3.6.1.2.1.2.2.1.5"
    @@in_octets_mib = "1.3.6.1.2.1.2.2.1.10"
    @@out_octets_mib = "1.3.6.1.2.1.2.2.1.16"

    # les variable d'instance name et monitor sont rendues lisibles directement
    attr_reader :name, :monitor, :coord, :label, :port_names

  # constructeur : nom, coordonées 3D, coord 3D label, monitor (boolean : à monitorer ?), 
  # ip, communauté snmp version protocole, adresse IP, tableau des noms de port à monitorer
  def initialize(name, coord, label, monitor, ip=nil, community=nil, version=nil, port_names=nil)
    @name = name
    @coord = coord
    @label = label
    @monitor = monitor
    if monitor then
      @host = ip.to_s
      @port_names = port_names        # hash des {noms de ports => destination} provenant du fichier de configuration
      @indexes = []                   # tableau des indexes d'interfaces de cet hôte
      @interfaces = Hash.new          # hash des objets interfaces de cet hôte
      connect(version, community)
      init_interfaces
    end
  end

  # function get_snmp : collecte des valeurs de trafic sur chaque interface.
  # Cette fonction renvoie un tableau de mesures (hashes) sur chaque port.
  def get_snmp

    # onvide le tableau des résultats précédents
    @deltas.clear
    # var temporaire pour détecter le changement de valeur d'index dans la liste de résultats
    tmp_index = ''

    # requête SNMP get :
    # la requête renvoie une ligne par index, cette ligne peut être in ou out,
    # les lignes in et out de chaque index se suivent forcément.
    response = @manager.get(@oids) 
    response.each_varbind do |oid|
      # récupération de la valeur de l'index sur la ligne de résultat : chaîne après le "."
      index = oid.name.to_s.split('.')[1].to_s
      if (tmp_index == index) then
        # si le nom est le même que la ligne lue précédente, on vient donc de lire la 2° ligne => out
        # on supprime le dernier élément du tableau @out et on y ajoute au début la mesure out.
        # idem avec le timestamp de la mesure.
        @out[index].shift
        @out[index].push(oid.value.to_i)
        @ts[index].shift
        @ts[index].push(Time.now.to_i)

        # calcul du delta in et out par intervalle de ts_delta
        ts_delta = @ts[index][1] - @ts[index][0]
        out_delta = (@out[index][1] - @out[index][0]) / ts_delta
        in_delta = (@in[index][1] - @in[index][0]) / ts_delta

        # récupération de l'objet Interface de cet index
        iface = @interfaces[index]

        # création d'un hash de résultat de la mesure pour chaque index
        # et ajout de ce hash dans le tableau @port_names
        port_delta = { name: iface.name, descr: iface.descr, speed: iface.speed ,octInOut: [in_delta, out_delta] }
        @deltas.push(port_delta)
      else
        #  index == tmp_index, donc on lit la première ligne d'index => in
        #  on supprime le dernier élément du tableau @in et on y ajoute au début la mesure in
        @in[index].shift
        @in[index].push(oid.value.to_i)
        tmp_index = index
      end
    end
    return @deltas 
  end

  # méthodes privées ##########################################
  private
  
  # connexion SNMP : version (défaut v2c), communauté snnmp (défaut "public")
  def connect(version=:SNMPv2c, community="public")
    @manager = Manager.new(:host => @host, :version => version, :community => community)
  end
  
  # fonction init_interfaces :
  # Initialise un tableau @delta pour stocker les deltas de mesure de chaque port.
  # Initialise un hash @in et un hash @out ayant pour clé chaque index de port :
  # ce hash contient un tableau contenant deux mesures successives de inOctects et de outOctets.
  # Idem pour le hash ts (timestamp unix).
  # Cette fonction génère de plus le tableau @oids des OID SNMP complets à requêter.
  def init_interfaces
    get_interfaces
    @deltas = []
    @in = Hash.new
    @out = Hash.new
    @ts = Hash.new
    @oids = []
    @indexes.each do |idx|
      @in[idx] = [0, 0]
      @out[idx] = [0, 0]
      @ts[idx] = [0, 0]
      @oids.push(@@in_octets_mib+'.'+idx) 
      @oids.push(@@out_octets_mib+'.'+idx) 
    end
  end

  # fonction get_interfaces :
  # Effectue un snmp walk pour récuperer les index, les descriptions et les vitesses à partir
  # des noms de ports du fichier de configuration.
  # Stocke les indexes trouvés dans @indexes et les objets Interface correspondants dans @interfaces[index]
  def get_interfaces
    puts "\n#{@name} : #{@host}"
    @manager.walk([@@oid_ifnames, @@oid_ifdescr, @@oid_ifspeed]) do |ifname, ifdescr, ifspeed|
      index = ifname.name.to_s.gsub("IF-MIB::ifName.","")
      name = ifname.value.to_s
      descr = ifdescr.value.to_s
      speed = ifspeed.value.to_i
      if @port_names.has_key?(name)         # si l'interface fait partie des ports demandés dans la conf
        then
          link = @port_names[name]
          @indexes.push(index)
          @interfaces[index] = Interface.new(index, name, descr, speed, link)
          link ||=  "nothing"
          puts "  got #{name}  index = #{index} speed = #{speed} linked to #{link}"
      end
    end
  end
end


# object Interface
class Interface
  attr_reader :index, :name, :descr, :speed, :link
  # constructeur 
  def initialize(index, name, descr, speed, link)
    @index = index                # index du port
    @name = name                  # nom du port
    @descr = descr                # description du port
    @speed = speed                # vitesse du port
    @link = link                  # nom de l'équipement relié au port
  end
end



# ===================
# Programme principal
# ===================

# tableau des résultats de toutes les mesures de tous les équipements
results = Hash.new
# tableaux des objets Host à monitorer
hosts = []
# tableau des objets à dessiner
graph = []


# ======================================================
# === code commun avec regenerate_graph.rb (début) =====

# fonction getHostByName
# renvoie un objet du graph par son nom, nil si non trouvé
def getHostByName(graph, name) 
  graph.each{ |host| if host[:name] == name then return host end  }
  return nil
end

# chargement de la configuration YAML
conf = YAML.load_file(file_conf_yaml)
file_devices_yaml = conf["file_devices_yaml"]
file_graph_json = conf["file_graph_json"]
file_monitor_json = conf["file_monitor_json"]
refresh_rate = conf["refresh_rate"]
default_step = conf["default_step"]
default_radius = conf["default_radius"]
default_vector = conf["default_vector"]
default_label_shift = conf["default_label_shift"]
cam_coord = conf["cam_coord"]
puts "\nApplication configuration file #{file_conf_yaml} loaded"

# chargement du fichier des devices YAML 
conf_devices = YAML.load_file(file_devices_yaml)
puts "\nDevice file #{file_devices_yaml} loaded"
puts "\nScanning devices ..."
conf_devices.each_pair {|name, params|
  name = name.strip
  coord = params["coord"]
  label = params["label"]
  type = params["type"]
  monitor = false
  # si une adresse ip est configurée, on monitore
  if params.has_key?("ip") then 
    monitor = true
    ip = params["ip"].strip
    community = params["community"].strip
    protocol_version = params["version"].to_sym
    ifnames = params["ifnames"]
  end
  if label.nil? then
    label = []
    label[0] = coord[0] + default_label_shift[0]
    label[1] = coord[1] + default_label_shift[1]
    label[2] = coord[2] + default_label_shift[2]
  end
  host = Host.new(name, coord, label, monitor, ip, community, protocol_version, ifnames)
  hosts.push(host)
  graph_host = {name: name, coord: coord, label: label, type: type, ifnames: ifnames, parent: nil, vector: default_vector}
  graph.push(graph_host)
}

# recherche des nœuds terminaux
# pour chaque destination de port_name, on cherche si elle existe déjà dans hosts
# et on l'ajoute comme nœud par défaut dans graph sinon
hosts.each{ |host|
  if host.monitor then
    # variable facteur d'angle, prendra les valeurs successives : 0, 1, -1, 2, -2, 3, -3, ...
    fact = 0
    host.port_names.each_value{ |dest|  
      # on ne s'occupe que des ifaces qui ont une destination   
      if (not dest.nil?) then      
        terminal_node = true
        host_dest = getHostByName(graph, dest)
        # si la destination est déjà dans le graphe, on met à jour le parent et on calcule le vecteur
        if host_dest then
          host_dest[:parent] = host.name
          vx = host_dest[:coord][0] - host.coord[0]
          vy = host_dest[:coord][1] - host.coord[1]
          vz = host_dest[:coord][2] - host.coord[2]
          host_dest[:vector] = [vx, vy, vz]
          terminal_node = false
        end
        # si le nœeud est terminal, on cherche son parent pour lui affecter ses :parent et :vector
        # et pour calculer ses coordonnées à partir du vecteur du parent et de sa positon de nœeud fils
        if terminal_node then
          parent_node = getHostByName(graph, host.name)
          vct = parent_node[:vector]
          magnitude = Math.sqrt(vct[0]*vct[0]+vct[1]*vct[1]+vct[2]*vct[2])
          if magnitude == 0 then magnitude = 1 end
          xOy = Math::PI/180*default_step[0]*fact
          xOz = Math::PI/180*default_step[1]*fact
          yOz = Math::PI/180*default_step[2]*fact
          vu0 = vct[0] / magnitude * default_radius
          vu1 = vct[1] / magnitude * default_radius
          vu2 = vct[2] / magnitude * default_radius
          # http://fr.wikipedia.org/wiki/Matrice_de_rotation#En_dimension_trois
          step_x = (Math::cos(xOy) * vu0 - Math::sin(xOy) * vu1) #* (Math::cos(xOz) * vu0 + Math::sin(xOz) * vu2)
          step_y = (Math::sin(xOy) * vu0 + Math::cos(xOy) * vu1) 
          step_z = vu2 #* (-Math::sin(xOz) * vu0 + Math.cos(xOz) * vu2)

          default_coord = [host.coord[0]+step_x, host.coord[1]+step_y, host.coord[2]+step_z]
          default_label = [host.coord[0]+step_x+default_label_shift[0], host.coord[1]+step_y+default_label_shift[1], host.coord[2]+step_z+default_label_shift[2]]
          graph_host_default = {name: dest, coord: default_coord, label: default_label, type: "default", ifnames: nil, parent: parent_node[:name], vector: nil}
          graph.push(graph_host_default)
          if fact > 0 then fact = -fact elsif fact < 0 then fact = -fact+1 else fact = 1 end
        end
        terminal_node = true
      end
    }
  end
}

# ajouter une détection de boucles dans le graphe ici
#

# génération du fichier json du graphe
file_graph = File.new(file_graph_json, "w")
file_graph.write(JSON.generate(graph))
file_graph.close
puts "\nFile #{file_graph_json} generated"


# === code commun avec regenerate_graph.rb (fin) =====
# ====================================================



# mettre ici, avant la boucle infinie, la suppression des objets plus utilisés pour le GC: graph, etc


# boucle de collecte SNMP
puts "\nMonitoring started with refresh rate = #{refresh_rate} s"
while true do
  # boucle sur tous les hosts de la configuration
  # on ne lance le get_snmp que sur host.monitor == true
  hosts.each{ |host|
    if host.monitor then
      results[host.name] = host.get_snmp
    end
  }
  file_json = File.new(file_monitor_json, "w")
  file_json.write(JSON.generate(results))
  file_json.close
  results.clear
  sleep(refresh_rate)
end
