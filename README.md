# home-zigbee-stack

Docker Compose stack running on a Raspberry Pi (`ralph`, `192.168.1.29`, Ubuntu 26.04 arm64) that bridges Zigbee devices to Alexa.

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Home Assistant | 8123 | Automation hub, Emulated Hue bridge for Alexa |
| Zigbee2MQTT | 8080 | Zigbee coordinator ↔ MQTT bridge |
| Mosquitto | 1883 | MQTT broker |

## Running

```bash
cp .env.example .env
# Edit .env: set RADIO_DONGLE_SERIAL_ID to the Zigbee dongle's /dev/serial/by-id/ path
docker compose up -d
```

Home Assistant UI: http://192.168.1.29:8123

## Alexa voice control (Emulated Hue)

Home Assistant impersonates a Philips Hue bridge on the LAN. The Echo Dot discovers it via UPnP/SSDP and controls lights directly — no AWS, no internet required.

**One-time setup:**
1. Ensure the Echo is on the **same subnet** as the Pi (`192.168.1.x`). Discovery uses SSDP multicast, which doesn't cross subnets — a guest/IoT network on a different subnet (e.g. `192.168.4.x`) will silently fail. If it ever stops working, check the Echo's network first.
2. Say **"Alexa, discover devices"** (or Alexa app → Devices → + → Add device → Other). Wait ~45 seconds.
3. Alexa should report finding "String lights".

**Voice commands:**
- "Alexa, turn on / turn off string lights"
- "Alexa, set string lights to 30%"

### Troubleshooting discovery

**Verify the bridge is reachable from another device on the LAN:**
```bash
curl http://192.168.1.29/description.xml   # should return XML mentioning "Philips hue"
curl http://192.168.1.29/api/test/lights   # should return JSON with "String lights"
```

**Check HA is listening on port 80:**
```bash
ss -tlnp | grep ':80 '
```

**Check HA logs for emulated_hue:**
```bash
docker logs homeassistant 2>&1 | grep -i emulated_hue
```

**Firewall:** if `ufw` is active, ensure port 80/tcp and 1900/udp (SSDP multicast) are open:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 1900/udp
```

**Stale Alexa cache:** in the Alexa app, forget "String lights" under Devices, then re-discover.

**Guest/IoT VLAN:** Emulated Hue uses LAN multicast. The Echo must be on the same subnet as the Pi — a separate guest or IoT VLAN that blocks multicast will prevent discovery.

> **Note:** The Pi's IP (`192.168.1.29`) is currently DHCP-assigned. If it changes, Alexa will show the light as "unreachable" until you re-run discovery. Reserving the IP as a static DHCP lease in your router is recommended.

## Adding more lights/switches

1. Pair the new Zigbee device via Zigbee2MQTT.
2. In `homeassistant/configuration.yaml`, add the new entity under `emulated_hue.entities`.
3. Restart Home Assistant: `docker restart homeassistant`.
4. Say "Alexa, discover devices".

## What's tracked in git

`homeassistant/` config files (`configuration.yaml`, `automations.yaml`, `scenes.yaml`, `scripts.yaml`, `blueprints/`) are tracked. Runtime state, secrets, caches, and databases are gitignored — see `.gitignore`.
