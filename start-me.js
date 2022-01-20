const mqtt = require('mqtt')
const express = require('express')
const Prometheus = require('prom-client');

const app = express()
const port = 9101

let Telemetry = {}

let createMetrics = (metrics_name, metrics_value, metrics_help) => {
  return   `# HELP ${metrics_name} As ${metrics_help}.\n`
         + `# TYPE ${metrics_name} gauge\n`
         + `${metrics_name} ${metrics_value}\n`
}

let templated = (obj) => {
    let template = []
    for(let key of Object.keys(obj)){
      if(typeof obj[key] === 'number') template.push( createMetrics(key,obj[key], key) )
    }
    return template.join('\n')
}
function unwrap(obj, prefix) {
    var res = {}
    if(typeof obj === 'object' && obj !== null){
      for (var k of Object.keys(obj)) {
          var val = obj[k],
              key = (prefix ? prefix + '_' + k : k)
          if (typeof val === 'object' && obj !== null){ Object.assign(res, unwrap(val, key)) }
          else{ res[key] = val }
      }
    }else{
      res[prefix] = obj
    }
    return res
}

const client  = mqtt.connect('mqtt://coldborn.com:1883', { clean: true, connectTimeout: 4000 })
      client.on('connect', () => client.subscribe('#', err => { }) )

client.on('message', (topic, message) => {
  let cach = null
      message = message.toString()
  try     {   cache = JSON.parse(message) }
  catch(e){   cache = message             }
  Telemetry = Object.assign(
      Telemetry,
      unwrap(
        cache,
        'sh_' + topic
          .replaceAll('/','_')
          .replaceAll('-','_')
          .replaceAll(':','_')
    ));
})

 app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`) )

 app.get('/metrics', (req, res) => {
  res.status(200).set('Content-Type', 'text/plain');
  console.log(Telemetry)
  res.send(templated(Telemetry));
})

/*
  # Prometheus example configuration.
  - job_name: "shellies"
    static_configs:
      - targets: ["localhost:9101"]
*/
