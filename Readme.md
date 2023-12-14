BUS Stops from OSM
==================
Fetch a list of bus routes and stops from the OSM database via the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) and write them as a gpx file with the stations as waypoints and the bus routes as tracks.

Usage
-----
* Clone this repo.
* install nodejs
* run _npm install_
* run _./getbuses.js out.gpx_ <br>
  this will fetch the bus data for a predefined bounding box (Canarias: Gomera) and writes them as out.gpx
* run _./getbuses.js outbb.gpx "28.003496667577,-17.370620727539,28.225759715539,-17.05421482309"_<br>
  this will fetch the data for the given bounding box

Links
-----
  * [OverPass Turbo](https://overpass-turbo.eu/index.html) for testing queries
  * [Overpass API doc](https://wiki.openstreetmap.org/wiki/Overpass_API)


