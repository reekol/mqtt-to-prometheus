const mqtt = require('mqtt')
const express = require('express')
const MQTT = 'mqtt://coldborn.com:1883'
const app = express()
const port = 9101

let Telemetry  = {}
let Persistant = {}

let createMetrics = (metrics_name, metrics_value, metrics_help) => {
  return   `# HELP ${metrics_name} As ${metrics_help}.\n` .replaceAll(/{(.*?)}/g, "")
         + `# TYPE ${metrics_name} gauge\n`               .replaceAll(/{(.*?)}/g, "")
         + `${metrics_name} ${metrics_value}\n`
}

let templated = (obj) => {
    let template = []
    for(let key of Object.keys(obj)){
      template.push( createMetrics(key,obj[key], key) )
    }
    return template.join('\n')
}

function unwrap(obj, prefix) {
    let res = {}
    if(typeof obj === 'object' && obj !== null){
      for (let k of Object.keys(obj)) {
          let val = obj[k],
              key = (prefix ? prefix + '_' + k : k)
          if (typeof val === 'object' && obj !== null){ Object.assign(res, unwrap(val, key)) }
          else{
            if(typeof val === 'number'){
              res[key] = val
            }else{
              res[key + `{label="${val}"}`] = 1
            }
          }
      }
    }else{
      if(typeof obj === 'number'){
        res[prefix] = obj
      }else{
        res[prefix + `{label="${obj}"}`] = 1
      }
    }
    return res
}

const client  = mqtt.connect(MQTT, { clean: true, connectTimeout: 4000 })
      client.on('connect', () => client.subscribe('#', err => { }) )

client.on('message', (topic, message) => {
  let cach = null
      message = message.toString()
  try     {   cache = JSON.parse(message) }
  catch(e){   cache = message             }

  let Unwrapped = unwrap(
      cache,
      'sh_' + topic
        .replaceAll('/','_')
        .replaceAll('-','_')
        .replaceAll(':','_')
  )
  Telemetry  = Object.assign(Telemetry, Unwrapped)
  Persistant = Object.assign(Persistant,Unwrapped)

})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`) )

app.get('/metrics', (req, res) => {
  res.status(200).set('Content-Type', 'text/plain');
  console.log(Telemetry)
  res.send(templated(Telemetry));
  Telemetry = {}
})

app.get('/persistant', (req, res) => {
  res.status(200).set('Content-Type', 'text/plain');
  res.send(templated(Persistant));
})

/*
  # Prometheus example configuration.
  - job_name: "shellies"
    static_configs:
      - targets: ["localhost:9101"]
*/
