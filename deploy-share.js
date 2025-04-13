import { getDeployableServers, getAvailableRam } from "./utils/server.js";
import { log } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    
    const verbose = ns.args.includes("--verbose");
    const loop = ns.args.includes("--loop");
    const scriptRam = ns.getScriptRam("share.js");
    
    // Get all deployable servers
    const deployServers = getDeployableServers(ns, "", true, false);
    
    log(ns, "\n=== RAM Sharing Setup ===", verbose);
    log(ns, `Found ${deployServers.length} deployable servers`, verbose);
    
    // Copy the share script to all servers
    for (const server of deployServers) {
        await ns.scp("share.js", server);
    }
    
    do {
        let totalThreads = 0;
        let totalRam = 0;
        let totalUsedRam = 0;
        
        log(ns, "\n=== RAM Sharing Status ===", verbose);
        
        for (const server of deployServers) {
            // Kill any existing share scripts
            ns.killall(server);
            
            // Calculate how many threads we can run
            const serverRam = getAvailableRam(ns, server);
            const threads = Math.floor(serverRam / scriptRam);
            
            if (threads > 0) {
                const maxRam = ns.getServerMaxRam(server);
                const usedRam = ns.getServerUsedRam(server);
                totalThreads += threads;
                totalRam += maxRam;
                totalUsedRam += usedRam;
                
                log(ns, `${server}: [RAM: ${usedRam.toFixed(2)}GB / ${maxRam}GB used] [Running ${threads} share threads]`, verbose);
                ns.exec("share.js", server, threads);
            }
        }
        
        log(ns, "\n=== Summary ===", verbose);
        log(ns, `Total Servers: ${deployServers.length}`, verbose);
        log(ns, `Total RAM: ${totalRam}GB`, verbose);
        log(ns, `Total Used RAM: ${totalUsedRam.toFixed(2)}GB`, verbose);
        log(ns, `Total Share Threads: ${totalThreads}`, verbose);

        if (loop) {
            log(ns, "\nChecking again in 10 seconds...", verbose);
            await ns.sleep(10000);
        }
    } while (loop);
} 