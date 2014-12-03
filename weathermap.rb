# encoding: utf-8
# Encoding.default_external = Encoding::UTF_8 

require 'json'
require 'snmp'
include SNMP

@file_conf = './weathermap.conf'
@file_json = '/var/www/html/weathermap/weathermap.json'

# OID IF-MIB::ifOutOctets et IF-MIB::ifInOctets
IN_OCTETS_MIB = "1.3.6.1.2.1.2.2.1.10"
OUT_OCTETS_MIB = "1.3.6.1.2.1.2.2.1.16" 

# switch
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


@manager = Manager.new(:host => @host, :version => :SNMPv2c, :community => @community) 

def get_snmp
  # var temporaire pour détecter le changement de de nom d'index
  tmp_name = ''
  # var de stockage des octets in et out
  inoct = 0
  outoct = 0
  # requête SNMP get :
  # la requête renvoie une ligne par index, cette ligne peut être in ou out
  # les lignes in et out de chaque index se suivent forcément
  response = @manager.get(@oids) 
  response.each_varbind do |oid|
    name = oid.name.to_s.split('.')[1].to_s
    if (tmp_name == name) then
      # le nom est le même que la ligne lue précédente => out
      # on vient de lire la 2° ligne, on stocke résultat dans un hash
      # on stocke ce hash dans le tableau @ports
      outoct = oid.value.to_i
      # timestamp unix
      ts = Time.now.to_i.to_s
      port = { idx: name, ts: ts, oct: [inoct, outoct] }
      @ports.push(port)
    else
      #  name == tmp_name, donc on lit la première ligne d'index => in
      inoct = oid.value.to_i
      tmp_name = name
    end
  end
  

end



while true do
  get_snmp
  file_json = File.new(@file_json, "w")
  file_json.write(JSON.generate(@ports))
  file_json.close
  sleep(refresh_rate)
end
