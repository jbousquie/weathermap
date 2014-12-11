# encoding: utf-8
# Encoding.default_external = Encoding::UTF_8 

# À corriger : refaire plus simple sans les objets Host

# Ce script sert uniquement à re-générer le fichier du json graphe à partir de la conf yaml
# Ceci est utile pour la mise au point du graphe dans l'espace : modification du yaml, regeneration graphe, aperçu browser

require 'yaml'
require 'json'

file_conf_yaml = './conf.yml'


# tableaux des objets Host à monitorer
hosts = []
# tableau des objets à dessiner
graph = []

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
    end
  end
end

# ==== code copié depuis weathermap.rb à partir d'ici =============

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
