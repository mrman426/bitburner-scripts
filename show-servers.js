import { getAllServers, findPathToServer } from "./utils/server.js";
import { listView, detailView } from "./utils/console.js";

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

    // Special case for home server
    if (target === "home") {
        const serverInfo = ns.getServer("home");
        const serverDetails = {
            "Server Name": "home",
            "Security": serverInfo.hackDifficulty.toFixed(2),
            "Max Money": `$${ns.formatNumber(serverInfo.moneyMax)}`,
            "Hack Level": serverInfo.requiredHackingSkill,
            "RAM": `${serverInfo.maxRam}GB`,
            "Root": serverInfo.hasAdminRights ? "Yes" : "No"
        };
        ns.tprint("=== Home Server Details ===\n" + detailView(serverDetails));
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
                "Max Money": `$${ns.formatNumber(serverInfo.moneyMax)}`,
                "Hack Level": serverInfo.requiredHackingSkill,
                "RAM": `${serverInfo.maxRam}GB`,
                "Root": serverInfo.hasAdminRights ? "Yes" : "No"
            };
        }).sort((a, b) => a["Hack Level"] - b["Hack Level"]);
        ns.tprint("=== Purchased Server Detailss ===\n" + listView(serverData));
        return;
    }

    // Autocomplete functionality
    if (target) {
        const matches = servers.filter(server => 
            server.toLowerCase().includes(target.toLowerCase())
        );

        if (matches.length === 0) {
            ns.tprint(`No servers found matching '${target}'`);
            return;
        }

        if (matches.length > 1) {
            const serverList = matches.map(server => ({ Server: server }));
            ns.tprint("=== Matching Servers ===\n" + listView(serverList));
            return;
        }

        // If we have exactly one match, proceed with showing its details
        const server = matches[0];
        const serverInfo = ns.getServer(server);
        const path = findPathToServer(ns, server).join(" -> ");
        
        const serverDetails = {
            "Server Name": server,
            "Path": path,
            "Security": serverInfo.hackDifficulty.toFixed(2),
            "Max Money": `$${ns.formatNumber(serverInfo.moneyMax)}`,
            "Hack Level": serverInfo.requiredHackingSkill,
            "RAM": `${serverInfo.maxRam}GB`,
            "Root": serverInfo.hasAdminRights ? "Yes" : "No"
        };
        
        ns.tprint("=== Server Details ===\n" + detailView(serverDetails));
        return;
    }

    // Prepare data for list view
    const serverData = servers
        .filter(server => server !== "home" && !server.startsWith("pserv-"))
        .map(server => {
            const serverInfo = ns.getServer(server);
            const path = findPathToServer(ns, server).join(" -> ");
            return {
                "Server": server,
                "Security": serverInfo.hackDifficulty.toFixed(2),
                "Max Money": `$${ns.formatNumber(serverInfo.moneyMax)}`,
                "Hack Level": serverInfo.requiredHackingSkill,
                "Root": serverInfo.hasAdminRights ? "Yes" : "No"
                //"Path": path
            };
        }).sort((a, b) => a["Hack Level"] - b["Hack Level"]);

    // Display servers
    ns.tprint("=== Network Scan Results ===\n" + listView(serverData));
}