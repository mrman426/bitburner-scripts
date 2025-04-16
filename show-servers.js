import { getAllServers, findPathToServer, calculateRequiredThreads, getRunningPrograms } from "./utils/server.js";
import { listView, detailView, formatRam, formatMoney, formatDelay } from "./utils/console.js";

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
    const servers = getAllServers(ns);
    const attacks = getRunningPrograms(ns, servers, ["attack.js", "hack.js", "grow.js", "weaken.js"]);

    // Special case for home server
    if (target === "home") {
        const serverInfo = ns.getServer("home");
        const serverDetails = {
            "Server": "home",
            "Security": serverInfo.hackDifficulty.toFixed(2),
            "Max Money": formatMoney(ns, serverInfo.moneyMax),
            "Hack Level": serverInfo.requiredHackingSkill,
            "RAM": formatRam(ns, serverInfo.maxRam),
            "Root": serverInfo.hasAdminRights ? "Yes" : "No",
            "Attacking": attacks.has("home") ? `${attacks.get("home").threads} threads` : "No"
        };
        ns.tprint("\n=== Home Server Details ===\n" + detailView(serverDetails));
        return;
    }

    // Special case for pserv- servers
    if (target === "pserv-") {
        const pservers = servers.filter(server => server.startsWith("pserv-"));
        if (pservers.length === 0) {
            ns.tprint("No purchased servers found");
            return;
        }
        const serverData = pservers.map(server => {
            const serverInfo = ns.getServer(server);
            return {
                "Server": server,
                "Security": serverInfo.hackDifficulty.toFixed(2),
                "Max Money": formatMoney(ns, serverInfo.moneyMax),
                "Hack Level": serverInfo.requiredHackingSkill,
                "RAM": formatRam(ns, serverInfo.maxRam),
                "Root": serverInfo.hasAdminRights ? "Yes" : "No",
                "Attacking": attacks.has(server) ? `${attacks.get(server).threads} threads` : "No"
            };
        }).sort((a, b) => a["Hack Level"] - b["Hack Level"]);
        ns.tprint("\n=== Purchased Server Detailss ===\n" + listView(serverData));
        return;
    }

    if (target) {
        const matches = servers.filter(server => 
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
        const threads = {
            weaken: calculateRequiredThreads(ns, server, 'weaken'),
            grow: calculateRequiredThreads(ns, server, 'grow'),
            hack: calculateRequiredThreads(ns, server, 'hack')
        };
        const totalThreads = threads.weaken + threads.grow + threads.hack;
        const attackTime = ns.getWeakenTime(server);

        // Calculate server details
        const serverDetails = {
            "Server": server,
            "Path": path,
            Money: `${formatMoney(ns, ns.getServerMoneyAvailable(server))} / ${formatMoney(ns, ns.getServerMaxMoney(server))}`,
            Security: `${ns.getServerSecurityLevel(server).toFixed(2)} / ${ns.getServerMinSecurityLevel(server).toFixed(2)}`,
            "Hack Level": serverInfo.requiredHackingSkill,
            "RAM": formatRam(ns, serverInfo.maxRam),
            "Root": serverInfo.hasAdminRights ? "Yes" : "No",
            "Threads Required (W+G+H=T)": `${threads.weaken}+${threads.grow}+${threads.hack}=${totalThreads}`,
            "Attacking": attacks.has(server) ? `${attacks.get(server).threads} threads` : "No",
            "Time to Attack": formatDelay(ns, attackTime) + " (" + Math.round(attackTime/1000) + "s)",
        };
        
        ns.tprint("\n=== Server Details ===\n" + detailView(serverDetails));
        return;
    }

    // Prepare data for list view
    const serverData = servers
        .filter(server => server !== "home" && !server.startsWith("pserv-"))
        .map(server => {
            const attackTime = ns.getWeakenTime(server);
            const serverInfo = ns.getServer(server);
            return {
                "Server": server,
                Money: `${formatMoney(ns, ns.getServerMoneyAvailable(server))} / ${formatMoney(ns, ns.getServerMaxMoney(server))}`,
                Security: `${ns.getServerSecurityLevel(server).toFixed(2)} / ${ns.getServerMinSecurityLevel(server).toFixed(2)}`,
                "Hack Level": serverInfo.requiredHackingSkill,
                "RAM": formatRam(ns, serverInfo.maxRam),
                "Root": serverInfo.hasAdminRights ? "Yes" : "No",
                "Attacking": attacks.has(server) ? `${attacks.get(server).threads} threads` : "No",
                "Time to Attack": formatDelay(ns, attackTime) + " (" + Math.round(attackTime/1000) + "s)",
            };
        }).sort((a, b) => a["Hack Level"] - b["Hack Level"]);

    // Display servers
    ns.tprint("\n=== Network Scan Results ===\n" + listView(serverData));
}