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

        const targetRam = totalMaxRam * 0.8; // 80% of total RAM
        let remainingRam = targetRam - totalUsedRam; // Remaining RAM to allocate for "share.js"
        let totalThreads = 0;

        log(ns, `\n=== RAM Sharing Status ===`, verbose);
        log(ns, `Total Max RAM: ${totalMaxRam}GB`, verbose);
        log(ns, `Total Used RAM: ${totalUsedRam.toFixed(2)}GB`, verbose);
        log(ns, `Target RAM (80%): ${targetRam.toFixed(2)}GB`, verbose);

        for (const server of deployServers) {
            if (remainingRam <= 0) break; // Stop if we've allocated all target RAM

            const maxRam = ns.getServerMaxRam(server);
            const usedRam = ns.getServerUsedRam(server);
            const availableRam = maxRam - usedRam;

            // Allocate only up to the remaining RAM needed
            const allocatableRam = Math.min(availableRam, remainingRam);
            const threads = Math.floor(allocatableRam / scriptRam);

            if (threads > 0) {
                totalThreads += threads;
                remainingRam -= threads * scriptRam;

                log(ns, `${server}: [RAM: ${usedRam.toFixed(2)}GB / ${maxRam}GB used] [Running ${threads} share threads]`, verbose);
                ns.exec("share.js", server, threads);
            }
        }

        log(ns, `\n=== Summary ===`, verbose);
        log(ns, `Total Servers: ${deployServers.length}`, verbose);
        log(ns, `Total Threads Allocated: ${totalThreads}`, verbose);
        log(ns, `Remaining RAM to Allocate: ${remainingRam.toFixed(2)}GB`, verbose);

        if (loop) {
            log(ns, "\nChecking again in 30 seconds...", verbose);
            await ns.sleep(30000);
        }
    } while (loop);
}