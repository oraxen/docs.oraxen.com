# Resource Pack Hosting

Oraxen allows multiple ways of hosting your resource pack. The resource pack has to be hosted, so it can be sent to other players.



## Overview

After Oraxen generates the resource pack, it automatically uploads it to a server, which then hosts the resource pack and allows other players to download it.
The resource pack can either be hosted on a remote server (atlas), or locally using the built-in webserver.



## Oraxen Atlas (Polymath)

### An external server hosted by Oraxen that allows the resource pack to be distributed easily without open ports or any setup.

The Oraxen Atlas is an external server (Polymath instance) hosted by Oraxen itself. It’s free, easy to use, and is the default option when first setting up Oraxen.
We recommend this method for most users as it's simple and mostly reliable. It also requires no additional server ports, making it the best choice for free minecraft server hosts.

### Configuration
The Oraxen Atlas is setup by default with the following configuration.

```yml
upload:
	enabled: true
    type: polymath #transfer.sh, polymath, or self-host
    polymath:
      server: atlas.oraxen.com # you can also host your own polymath instance
      secret: "oraxen" # change this if you host your own polymath to limit access to resource pack uploading
```

### Limitations & Advantages
✓ Free to use
✓ Easy to set up
✓ Requires no additional ports or setup

✗ May not work in some countries (Russia, China)
✗ May experience occasional downtime



## Self-Hosted Polymath Instance

### A server that has to be hosted by yourself.

Oraxen allows you to host your own Polymath instance and connect it to Oraxen. It makes you independent from Oraxen's atlas and fixes most country related issues.

### Configuration
You can host your own Polymath instance by following [this](https://github.com/oraxen/polymath) guide. Polymath is open source and it's mostly easy to set up.
After successfully running your own Polymath instance, you have to configure Oraxen to point at it instead of the default one.

```yml
upload:
	enabled: true
    type: polymath #transfer.sh, polymath, or self-host
    polymath:
      server: atlas.oraxen.com # this is the domain your polymath instance runs on
      secret: "oraxen" # this is the secret key used to authenticate requests, so other people cannot upload resource packs to your polymath
```

### Limitations & Advantages
✓ Independent from the Oraxen Atlas
✓ Works in all countries (including Russia, China)

✗ Requires a webserver
✗ Requires additional setup
✗ Requires a port & must be accessible from outside network



## Self-Hosted Minecraft Server (with an open Port)

### Runs on your Minecraft server using Java's built-in `com.sun.net.httpserver`.

Oraxen allows you to host your own resource pack server directly on your Minecraft server with an open port.

### Configuration

```yml
upload:
    enabled: true
    type: self-host
    self-host:
      host: "0.0.0.0" # The IP address to bind the HTTP server to (0.0.0.0 = listen on all interfaces)
      port: 8080 # The port the HTTP server will listen on
      domain: "localhost:8080" # The domain/IP:port that players will use to download the pack (e.g., "my-server.com:8080" or "192.168.1.100:8080")
```

### Limitations & Advantages
✓ Independent from the Oraxen Atlas
✓ Works in all countries (including Russia, China)

✗ Requires a port & must be accessible from outside network
✗ May use more of server resources (CPU/RAM, but usually not noticeable)



## Default Setup

```yml
Pack:
  upload:
  enabled: true
  type: polymath #transfer.sh, polymath, or self-host
  polymath:
    server: atlas.oraxen.com # you can also host your own polymath instance
    secret: "oraxen" # change this if you host your own polymath to limit access to resource pack uploading
  self-host:
    host: "0.0.0.0" # The IP address to bind the HTTP server to (0.0.0.0 = listen on all interfaces)
    port: 8080 # The port the HTTP server will listen on
    domain: "localhost:8080" # The domain/IP:port that players will use to download the pack (e.g., "my-server.com:8080" or "192.168.1.100:8080")
```