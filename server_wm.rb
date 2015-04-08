# script de lancement de Wézeurmap en mode daemon
require 'daemons'

Daemons.run('./weathermap.rb')