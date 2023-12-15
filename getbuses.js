#!/usr/bin/env node
import osmtogeojson from "osmtogeojson";
import { readFileSync, writeFileSync } from 'node:fs';
import path from "node:path";
import * as url from 'url';
import fetch from 'node-fetch';
import togpx from 'togpx';
import tokml from 'tokml';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const API="https://overpass-api.de/api/interpreter";
const QUERY="q.txt";
const BBOX_GOM="(28.003496667577,-17.370620727539,28.225759715539,-17.05421482309)";
let triggerDiff = 4 / 60; //3 minutes  -> n *1852m - check if we have such jumps
let idx=2;
let outKml=false
while (idx < process.argv.length){
    if (process.argv[idx][0] !== '-') break;
    if (process.argv[idx] === '-k'){
        outKml=true;
    }
    idx++;
}
if (idx >= process.argv.length) {
    console.error(`usage: ${process.argv[0]} ${process.argv[1]} outname [bbox (s,w,n,e)]`);
    process.exit(1);
  }
let outname=process.argv[idx]; 
let bb=BBOX_GOM;
if (idx < (process.argv.length-1)){
    bb=process.argv[idx+1];
    if (! bb.match(/^ *\(.*\)/)) bb="("+bb+")";
}
let fn=path.join(__dirname,QUERY);
let qv=readFileSync(fn,{encoding: 'utf8'});
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
//let gfile=path.join(__dirname,"out.geojson");
//writeFileSync(gfile,JSON.stringify(filtered));
if (triggerDiff !== undefined) {
    filtered.features.forEach((feature) => {
        let x = feature;
        if (feature.geometry && feature.geometry.type === 'MultiLineString') {
            let lastLat;
            let lastLon;
            feature.geometry.coordinates.forEach((seg, si) => {
                seg.forEach((ll, i) => {
                    let curLat = ll[0];
                    let curLon = ll[1];
                    if (lastLat !== undefined && lastLon !== undefined) {
                        let laDiff = Math.abs(curLat - lastLat);
                        let loDiff = Math.abs(curLon - lastLon);
                        if (laDiff > triggerDiff) {
                            console.log("laDiff", si, i, feature);
                        }
                        if (loDiff > triggerDiff) {
                            console.log("loDiff", si, i, feature)
                        }
                    }
                    lastLat = curLat;
                    lastLon = curLon;
                })
            })
        }
    })
}
if (outKml){
    filtered.features.forEach((feature) => {
        if (feature.properties){
            feature.properties.link=`http://osm.org/browse/${feature.properties.id}`;    
        }
    })
    let kml= tokml(filtered, {
        documentName: "OverpassAPI Buses export",
        documentDescription:
          `Filtered OSM data converted to KML by overpass turbo.\n` +
          `Copyright: Overpass API OSM\n` +
          `Timestamp: `+(new Date()).toDateString(),
        name: "name",
        description: "description"
      });
    console.log(kml);
    writeFileSync(outname, kml);
}
else {
    let gpx_str = togpx(filtered, {
        creator: "OSM",
        metadata: {
            desc: "Filtered OSM data converted to GPX by overpass turbo",
            copyright: { "@author": "OverpassAPI OSM" },
            time: (new Date()).toDateString()
        },
        featureTitle(props) {
            let title = getFeatureTitle(props);
            if (existingTitles[title]) {
                title += " " + props.id.replace(/.*[/]/, "");
            }
            existingTitles[title] = true;
            return title;
        },
        //featureDescription: function(props) {},
        featureLink(props) {
            return `http://osm.org/browse/${props.id}`;
        }
    });
    if (gpx_str[1] !== "?") {
        gpx_str = `<?xml version="1.0" encoding="UTF-8"?>\n${gpx_str}`;
    }
    console.log(gpx_str);
    writeFileSync(outname, gpx_str);
}

