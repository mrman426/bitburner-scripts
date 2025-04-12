/** @param {NS} ns */
export async function main(ns) {
    const scriptName = "attack.js";
    const scriptRam = ns.getScriptRam(scriptName);
    const target = ns.args[0] || "";
    
    // Function to get all servers within security level
    function getAllServers() {
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

    // Function to open all available ports on a server
    function openPorts(server) {
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
    
    // Get all servers and filter out those we can't hack
    const allServers = getAllServers();
    const hackableServers = allServers.filter(server => {
        const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
        return requiredHackingLevel <= ns.getHackingLevel();
    });
    
    for (const server of hackableServers) {
        // Skip home server
        if (server === "home") continue;
        
        // Try to nuke the server
        if (!ns.hasRootAccess(server)) {
            ns.tprint(`Attempting to gain root access on ${server}...`);
            const portsOpened = openPorts(server);
            if (portsOpened >= ns.getServerNumPortsRequired(server)) {
                ns.nuke(server);
                ns.tprint(`Successfully gained root access on ${server}`);
            } else {
                ns.tprint(`Not enough ports opened for ${server}. Need ${ns.getServerNumPortsRequired(server)} but only opened ${portsOpened}`);
            }
        }
        
        // If we have root access, deploy the script
        if (ns.hasRootAccess(server)) {
            ns.tprint(`Deploying to ${server}...`);
            
            // Copy the script
            await ns.scp(scriptName, server);
            
            // Calculate how many threads we can run
            const serverRam = ns.getServerMaxRam(server);
            const threads = Math.floor(serverRam / scriptRam);
            
            if (threads > 0) {
                ns.tprint(`Running ${threads} threads on ${server}`);
                ns.exec(scriptName, server, threads, target);
            }
        }
    }
    
    ns.tprint("Deployment complete!");
} 