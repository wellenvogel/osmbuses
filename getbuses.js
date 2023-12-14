#!/usr/bin/env node
import osmtogeojson from "osmtogeojson";
import { readFileSync, writeFileSync } from 'node:fs';
import path from "node:path";
import * as url from 'url';
import fetch from 'node-fetch';
import togpx from 'togpx';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const API="https://overpass-api.de/api/interpreter";
const QUERY="q.txt";
if (process.argv.length < 3) {
    console.error(`usage: ${process.argv[0]} ${process.argv[1]} outname`);
    process.exit(1);
  }
let outname=process.argv[2]; 
let fn=path.join(__dirname,QUERY);
let qv=readFileSync(QUERY);
console.log(`query: ${qv}`);
let osmjson=await fetch(API,{
    method: "POST",
    body: "data="+ encodeURIComponent(qv)
    }).then((r)=>r.json());
let geojson=osmtogeojson(osmjson);
let gpx_str = togpx(geojson, {
    creator: "OSM",
    metadata: {
      desc: "Filtered OSM data converted to GPX by overpass turbo",
      copyright: {"@author": "OverpassAPI OSM"},
      time: (new Date()).toDateString()
    },
    featureTitle(props) {
      if (props.tags) {
        if (props.tags.name) return props.tags.name;
        if (props.tags.ref) return props.tags.ref;
        if (props.tags["addr:housenumber"] && props.tags["addr:street"])
          return `${props.tags["addr:street"]} ${props.tags["addr:housenumber"]}`;
      }
      return `${props.type}/${props.id}`;
    },
    //featureDescription: function(props) {},
    featureLink(props) {
      return `http://osm.org/browse/${props.type}/${props.id}`;
    }
  });
  if (gpx_str[1] !== "?"){
    gpx_str = `<?xml version="1.0" encoding="UTF-8"?>\n${gpx_str}`;
  }
console.log(gpx_str);
writeFileSync(outname,gpx_str);

