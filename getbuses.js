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
const BBOX_GOM="(28.003496667577,-17.370620727539,28.225759715539,-17.05421482309)";
if (process.argv.length < 3) {
    console.error(`usage: ${process.argv[0]} ${process.argv[1]} outname [bbox (s,w,n,e)]`);
    process.exit(1);
  }
let outname=process.argv[2]; 
let bb=BBOX_GOM;
if (process.argv.length > 3){
    bb=process.argv[3];
    if (! bb.match(/^ *\(.*\)/)) bb="("+bb+")";
}
let fn=path.join(__dirname,QUERY);
let qv=readFileSync(QUERY,{encoding: 'utf8'});
qv=qv.replaceAll("${bbox}",bb);
console.log(`query: ${qv}`);
let osmjson=await fetch(API,{
    method: "POST",
    body: "data="+ encodeURIComponent(qv)
    }).then((r)=>r.json());
let geojson=osmtogeojson(osmjson);
let filtered={
    type: 'FeatureCollection',
    features:[]
};
geojson.features.forEach((feature)=>{
    if (feature.properties && feature.properties.route === 'bus'){
        filtered.features.push(feature);
        return;
    }
    if (feature.properties && feature.properties.bus === 'yes'){
        filtered.features.push(feature);
        return;
    }  
});
const getFeatureTitle=(props)=>{
    if (props.name !== undefined) return props.name;
    if (props.type !== undefined) return `${props.type}/${props.id}`;
    return props.id;    
}
let existingTitles={};
let gpx_str = togpx(filtered, {
    creator: "OSM",
    metadata: {
      desc: "Filtered OSM data converted to GPX by overpass turbo",
      copyright: {"@author": "OverpassAPI OSM"},
      time: (new Date()).toDateString()
    },
    featureTitle(props) {
        let title=getFeatureTitle(props);
        if (existingTitles[title]){
            title+=" "+props.id.replace(/.*[/]/,"");
        }
        existingTitles[title]=true;
        return title;
    },
    //featureDescription: function(props) {},
    featureLink(props) {
        return `http://osm.org/browse/${props.id}`;
    }
  });
  if (gpx_str[1] !== "?"){
    gpx_str = `<?xml version="1.0" encoding="UTF-8"?>\n${gpx_str}`;
  }
console.log(gpx_str);
writeFileSync(outname,gpx_str);

