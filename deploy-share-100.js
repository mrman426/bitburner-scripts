import { getDeployableServers, getAvailableRam } from "./utils/server.js";
import { log } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    
    const verbose = ns.args.includes("--verbose");
    const loop = ns.args.includes("--loop");
    const scriptRam = ns.getScriptRam("share.js");
    
    // Get all deployable servers and sort them by max RAM (ascending)
    const deployServers = getDeployableServers(ns, "", true, false)
        .filter(server => server !== "home")
        .sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));
    
    log(ns, "\n=== RAM Sharing Setup ===", verbose);
    log(ns, `Found ${deployServers.length} deployable servers`, verbose);
    
    // Copy the share script to all servers
    for (const server of deployServers) {
        await ns.scp("share.js", server);
    }
    
    do {
        let totalAvailableRam = 0;
        let totalMaxRam = 0;
        let totalUsedRam = 0;

        // Calculate total RAM stats
        for (const server of deployServers) {
            const maxRam = ns.getServerMaxRam(server);
            const usedRam = ns.getServerUsedRam(server);
            const availableRam = maxRam - usedRam;

            totalMaxRam += maxRam;
            totalUsedRam += usedRam;
            totalAvailableRam += availableRam;
        }

        log(ns, `\n=== RAM Sharing Status ===`, verbose);
        log(ns, `Total Max RAM: ${totalMaxRam}GB`, verbose);
        log(ns, `Total Used RAM: ${totalUsedRam.toFixed(2)}GB`, verbose);
        log(ns, `Total Usage: ${(totalUsedRam / totalMaxRam * 100).toFixed(2)}%`, verbose);

        if (totalUsedRam / totalMaxRam > 1.0) {
            log(ns, "RAM usage is above 80%. Waiting 30 seconds....", verbose);
            await ns.sleep(30000);
            continue;
        }

        let totalThreads = 0;

        for (const server of deployServers) {
            const maxRam = ns.getServerMaxRam(server);
            const usedRam = ns.getServerUsedRam(server);
            const availableRam = maxRam - usedRam;

            // Use all available RAM for deploying threads
            const deployableRam = availableRam;
            const threads = Math.floor(deployableRam / scriptRam);

            if (threads > 0) {
                totalThreads += threads;
                log(ns, `${server}: [RAM: ${usedRam.toFixed(2)}GB / ${maxRam}GB used] [Running ${threads} share threads]`, verbose);
                ns.exec("share.js", server, threads);
            }
        }

        log(ns, `\n=== Summary ===`, verbose);
        log(ns, `Total Servers: ${deployServers.length}`, verbose);
        log(ns, `Total Threads Allocated: ${totalThreads}`, verbose);

        if (loop) {
            log(ns, "\nChecking again in 30 seconds...", verbose);
            await ns.sleep(30000);
        }
    } while (loop);
}