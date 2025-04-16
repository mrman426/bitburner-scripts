import { getAllServers, findPathToServer, calculateRequiredThreads, getRunningPrograms, calculateAttackThreads } from "./utils/server.js";
import { listView, detailView, formatNumber, formatRam, formatMoney, formatDelay } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, flags) {
	return data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const allServers = getAllServers(ns);
    const attacks = getRunningPrograms(ns, allServers, ["attack.js", "hack.js", "grow.js", "weaken.js"]);

    // Special case for home server
    if (target === "home") {
        const serverInfo = ns.getServer("home");
        const serverDetails = {
            "Server": "home",
            "RAM": formatRam(ns, serverInfo.maxRam),
        };
        ns.tprint("\n=== Home Server Details ===\n" + detailView(serverDetails));
        return;
    }

    // Special case for pserv- servers
    if (target === "pserv-") {
        const pservers = allServers.filter(server => server.startsWith("pserv-"));
        if (pservers.length === 0) {
            ns.tprint("No purchased servers found");
            return;
        }
        const serverData = pservers.map(server => {
            const serverInfo = ns.getServer(server);
            return {
                "Server": server,
                "RAM": formatRam(ns, serverInfo.maxRam),
            };
        }).sort((a, b) => a["Hack Level"] - b["Hack Level"]);
        ns.tprint("\n=== Purchased Server Detailss ===\n" + listView(serverData));
        return;
    }

    if (target) {
        const matches = allServers.filter(server => 
            server.toLowerCase() === target.toLowerCase()
        );

        if (matches.length === 0) {
            ns.tprint(`No servers found matching '${target}'`);
            return;
        }

        // If we have a match, proceed with showing its details
        const server = matches[0];
        const serverInfo = ns.getServer(server);
        const path = findPathToServer(ns, server).join("; connect ") + "; backdoor";
        const requiredThreads = {
            weaken: calculateRequiredThreads(ns, server, 'weaken'),
            grow: calculateRequiredThreads(ns, server, 'grow'),
            hack: calculateRequiredThreads(ns, server, 'hack')
        };
        const proThreads = calculateAttackThreads(ns, server);
        const totalRequiredThreads = requiredThreads.weaken + requiredThreads.grow + requiredThreads.hack;
        const totalProThreads = proThreads.hack + proThreads.weaken + proThreads.grow + proThreads.growWeaken;
        const attackTime = ns.getWeakenTime(server);

        // Calculate server details
        const serverDetails = {
            "Server": server,
            "Path": path,
            Money: `${formatMoney(ns, ns.getServerMoneyAvailable(server))} / ${formatMoney(ns, ns.getServerMaxMoney(server))}`,
            Security: `${ns.getServerSecurityLevel(server).toFixed(1)} / ${ns.getServerMinSecurityLevel(server).toFixed(1)}`,
            "RAM": formatRam(ns, serverInfo.maxRam),
            "Hack Level": serverInfo.requiredHackingSkill,
            "Root": serverInfo.hasAdminRights ? "Yes" : "No",
            "Threads": parseInt(totalRequiredThreads) ? formatNumber(ns, totalRequiredThreads) : "-",
            "PThreads": parseInt(totalProThreads) ? formatNumber(ns, totalProThreads) : "-",
            "Attack Time": Math.round(attackTime/1000) + "s",
            "Attacking": attacks.has(server) ? `${attacks.get(server).threads} threads` : "No",
        };
        
        ns.tprint("\n=== Server Details ===\n" + detailView(serverDetails));
        return;
    }

    // Prepare data for list view
    const serverData = allServers
        .filter(server => server !== "home" && !server.startsWith("pserv-"))
        .map(server => {
            const serverInfo = ns.getServer(server);
            const requiredThreads = {
                weaken: calculateRequiredThreads(ns, server, 'weaken'),
                grow: calculateRequiredThreads(ns, server, 'grow'),
                hack: calculateRequiredThreads(ns, server, 'hack')
            };
            const proThreads = calculateAttackThreads(ns, server);
            const totalRequiredThreads = requiredThreads.weaken + requiredThreads.grow + requiredThreads.hack;
            const totalProThreads = proThreads.hack + proThreads.weaken + proThreads.grow + proThreads.growWeaken;
            const attackTime = ns.getWeakenTime(server);
    
            return {
                "Server": server,
                Money: `${formatMoney(ns, ns.getServerMoneyAvailable(server))} / ${formatMoney(ns, ns.getServerMaxMoney(server))}`,
                Security: `${ns.getServerSecurityLevel(server).toFixed(1)} / ${ns.getServerMinSecurityLevel(server).toFixed(1)}`,
                "RAM": formatRam(ns, serverInfo.maxRam),
                "Hack Level": serverInfo.requiredHackingSkill,
                "Root": serverInfo.hasAdminRights ? "Yes" : "No",
                "Threads": parseInt(totalRequiredThreads) ? formatNumber(ns, totalRequiredThreads) : "-",
                "PThreads": parseInt(totalProThreads) ? formatNumber(ns, totalProThreads) : "-",
                "Attack Time": Math.round(attackTime/1000) + "s",
                "Attacking": attacks.has(server) ? `${attacks.get(server).threads} threads` : "No",
            };
        }).sort((a, b) => a["Hack Level"] - b["Hack Level"]);

    // Display servers
    ns.tprint("\n=== Network Scan Results ===\n" + listView(serverData));
}