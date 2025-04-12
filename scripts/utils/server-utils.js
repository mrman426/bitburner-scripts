/** @param {NS} ns */
export function getAllServers(ns) {
    const servers = new Set();
    const toScan = ["home"];
    
    while (toScan.length > 0) {
        const server = toScan.pop();
        if (servers.has(server)) continue;
        servers.add(server);
        
        const connected = ns.scan(server);
        for (const s of connected) {
            if (!servers.has(s)) {
                toScan.push(s);
            }
        }
    }
    
    return Array.from(servers);
}

/** @param {NS} ns */
export function getDeployableServers(ns, targetServer, useAllServers = false, usePurchasedOnly = false) {
    const allServers = getAllServers(ns);
    
    return allServers.filter(server => {
        // Skip servers with no RAM
        if (ns.getServerMaxRam(server) === 0) return false;
        
        // Skip target server
        if (server === targetServer) return false;
        
        // Skip home server
        if (usePurchasedOnly && server === "home") return true;
        
        // If using purchased servers only, only include servers that start with "pserv-"
        if (usePurchasedOnly && !server.startsWith("pserv-")) return false;
        
        // If using all servers, include everything that passes above checks
        if (useAllServers) return true;
        
        // Default to purchased servers only (servers that start with "pserv-")
        return server.startsWith("pserv-");
    });
}

/** @param {NS} ns */
export function getAvailableRam(ns, server) {
    const maxRam = ns.getServerMaxRam(server);
    const usedRam = ns.ps(server).reduce((sum, process) => sum + process.threads * ns.getScriptRam(process.filename), 0);
    const availableRam = maxRam - usedRam;
    
    // Reserve 16GB on home server
    if (server === "home") {
        return Math.max(0, availableRam - 16);
    }
    
    return availableRam;
}

/** @param {NS} ns */
export function openPorts(ns, server) {
    const programs = [
        { name: "BruteSSH.exe", func: ns.brutessh },
        { name: "FTPCrack.exe", func: ns.ftpcrack },
        { name: "relaySMTP.exe", func: ns.relaysmtp },
        { name: "HTTPWorm.exe", func: ns.httpworm },
        { name: "SQLInject.exe", func: ns.sqlinject }
    ];

    let portsOpened = 0;
    for (const program of programs) {
        if (ns.fileExists(program.name, "home")) {
            program.func(server);
            portsOpened++;
        }
    }
    return portsOpened;
}

/** @param {NS} ns */
export async function hackServer(ns, server) {
    if (server === "home") return false;
    if (ns.hasRootAccess(server)) return true;

    const requiredPorts = ns.getServerNumPortsRequired(server);
    const portsOpened = openPorts(ns, server);

    if (portsOpened >= requiredPorts) {
        ns.nuke(server);
        ns.tprint(`Gained root access on ${server}`);
        return true;
    } else {
        ns.tprint(`Could not gain root access on ${server} (need ${requiredPorts} ports, opened ${portsOpened})`);
        return false;
    }
} 