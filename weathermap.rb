# encoding: utf-8
# Encoding.default_external = Encoding::UTF_8 

# Ce script fait une connexion SNMP à un routeur.
# Il initialise un tableau à deux éléments pour chaque port du routeur sélectionné dans le tableau @indexes.
# Ces deux éléments seront des valeurs de mesure des octets in et out sur chaque port.
# Le script est une boucle infinie qui, à intervalles réguliers refresh_rate (secondes), lance une collecte
# des valeurs inOctects et outOctects sur la liste des ports du tableau @indexes et les stockes dans les tableaux @in et @out.
# Il calcule après chaque collecte le delta avec la mesure précédente et le stocke dans un hash par index.
# Chaque hash est inséré dans un tableau @ports, lui même associé à chaque @host du tableau @hosts
# Ce tableau est encodé en JSON est écrit dans un fichier publiable sur le web.

# Pour l'instant le script est en mode Quick&Dirty : utilisation de variables globales, appel des fonctions sans paramètres, etc.
# À refactorer !

require 'json'
require 'snmp'
include SNMP

@file_conf = './weathermap.conf'
@file_json = '/var/www/html/weathermap/weathermap.json'

# OID IF-MIB::ifOutOctets et IF-MIB::ifInOctets
IN_OCTETS_MIB = "1.3.6.1.2.1.2.2.1.10"
OUT_OCTETS_MIB = "1.3.6.1.2.1.2.2.1.16" 

# équipements
@hosts = Hash.new

# 1 unique switch pour l'instant
@host = '192.168.0.100'
@community = 'comcacti'
refresh_rate = 15
@indexes = ['10122', '10125', '10127', '10101', '10102']
@oids = []
@indexes.each { |i| 
	@oids.push(IN_OCTETS_MIB+'.'+i) 
	@oids.push(OUT_OCTETS_MIB+'.'+i) 
	}
@ports = []
@hosts[@host] = @ports

# ouverture de la connexion SNMP
@manager = Manager.new(:host => @host, :version => :SNMPv2c, :community => @community) 


# fonction init_interfaces :
# initialise un hash @in et un hash @out ayant pour clé chaque index d'interface (ports).
# Ce hash contient un tableau à deux éléments contenant deux mesures successives inOctects et outOctets.
# idem pour le hash ts (timestamp unix)
def init_interfaces
  @in = Hash.new
  @out = Hash.new
  @ts = Hash.new
  @indexes.each do |idx|
    @in[idx] = [0, 0]
    @out[idx] = [0, 0]
    @ts[idx] = [0, 0]
  end
end


# function get_snmp : collecte des valeurs de trafic sur chaque interface
def get_snmp
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

      # calcul du delta in et out
      out_delta = @out[index][1] - @out[index][0] 
      in_delta = @in[index][1] - @in[index][0]
      ts_delta = @ts[index][1] - @ts[index][0]

      # création d'un hash de résultat de la mesure pour chaque index
      # et ajout de ce hash dans le tableau @ports
      port = { idx: index, dur: ts_delta, in_out: [in_delta, out_delta] }
      @ports.push(port)
    else
      #  index == tmp_index, donc on lit la première ligne d'index => in
      #  on supprime le dernier élément du tableau @in et on y ajoute au début la mesure in
      @in[index].shift
      @in[index].push(oid.value.to_i)
      tmp_index = index
    end
  end 
end



# Programme principal
# ===================

# création des tableaux de stockages des données
init_interfaces

# boucle de collecte
while true do
  get_snmp
  file_json = File.new(@file_json, "w")
  file_json.write(JSON.generate(@hosts))
  file_json.close
  @ports.clear
  sleep(refresh_rate)
end
