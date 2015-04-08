# script de lancement de Wézeurmap en mode daemon
# https://github.com/thuehlinger/daemons

require 'daemons'

Daemons.run('./weathermap.rb')