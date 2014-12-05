# encoding: utf-8
# Encoding.default_external = Encoding::UTF_8 

 # Corriger le commentaire initial : plus Q&D, classe désormais !!!

# Ce script fait une connexion SNMP à un routeur.
# Il initialise un tableau à deux éléments pour chaque port du routeur sélectionné dans le tableau @indexes.
# Ces deux éléments seront des valeurs de mesure des octets in et out sur chaque port.
# Le script est une boucle infinie qui, à intervalles réguliers refresh_rate (secondes), lance une collecte
# des valeurs inOctects et outOctects sur la liste des ports du tableau @indexes et les stockes dans les tableaux @in et @out.
# Il calcule après chaque collecte le delta avec la mesure précédente et le stocke dans un hash par index.
# Chaque hash est inséré dans un tableau @port_names, lui même associé à chaque @host du tableau @hosts
# Ce tableau est encodé en JSON est écrit dans un fichier publiable sur le web.


require 'yaml'
require 'json'
require 'snmp'
include SNMP

file_yaml = './weathermap.yml'
file_json = '/var/www/html/weathermap/weathermap.json'


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
    attr_reader :name, :monitor

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
    puts "\n#{@name} :"
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

# délai de collecte général
refresh_rate = 15


# chargement du fichier de conf YAML 
conf = YAML.load_file(file_yaml)
conf.each_pair {|name, params|
  name = name.strip
  coord = params["coord"]
  label = params["label"]
  monitor = false
  # si une adresse ip est configurée, on monitore
  if params.has_key?("ip") 
    then 
    monitor = true
    ip = params["ip"].strip
    community = params["community"].strip
    protocol_version = params["version"].to_sym
    ifnames = params["ifnames"]
  end
  host = Host.new(name, coord, label, monitor, ip, community, protocol_version, ifnames)
  hosts.push(host)
}


# boucle de collecte
puts "\nMonitoring started with refresh rate = #{refresh_rate} s"
while true do
  # ici boucle sur tous les hosts de la conf à faire
  hosts.each{ |host|
    if host.monitor then
      results[host.name] = host.get_snmp
    end
  }
  file_json = File.new(file_json, "w")
  file_json.write(JSON.generate(results))
  file_json.close
  results.clear
  sleep(refresh_rate)
end
