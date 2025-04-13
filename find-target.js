import { getAllServers, getServerScores } from "./utils/server-utils.js";

/** @param {NS} ns */
export async function main(ns) {
    // Get all servers
    const allServers = getAllServers();
    const targetServers = allServers.filter(server => {
        if (server === "home") return false;
        return ns.hasRootAccess(server);
    });
    
    // Analyze each server and calculate a score
    const serverScores = getServerScores(ns)
    
    // Sort servers by score in descending order
    serverScores.sort((a, b) => b.score - a.score);
    
    // Display top servers
    ns.tprint("\nTop 25 Best Servers to Attack:");
    ns.tprint("=======================================================================");
    ns.tprint("Server\t\tScore\t\tMoney\t\tSecurity\tTime (secs)");
    ns.tprint("=======================================================================");
    
    // Find the longest server name
    const maxServerNameLength = Math.max(...serverScores.map(s => s.server.length));
    const maxScoreLength = Math.max(...serverScores.map(s => s.score.toFixed(2).length));
    const maxMoneyLength = Math.max(...serverScores.map(s => ns.formatNumber(s.maxMoney).length));
    const securityLength = Math.max(...serverScores.map(s => s.minSecurity.toFixed(2).length));
    const timeLength = Math.max(...serverScores.map(s => (s.timeToAttack / 1000).toFixed(2).length));
    
    for (let i = 0; i < Math.min(25, serverScores.length); i++) {
        const s = serverScores[i];
        const paddedServerName = s.server.padEnd(maxServerNameLength);
        const paddedScore = s.score.toFixed(2).padStart(maxScoreLength);
        const paddedMoney = ns.formatNumber(s.maxMoney).padStart(maxMoneyLength);
        const paddedSecurity = s.minSecurity.toFixed(2).padStart(securityLength);
        const paddedTime = (s.timeToAttack / 1000).toFixed(2).padStart(timeLength);
        ns.tprint(`${paddedServerName}\t${paddedScore}\t\t$${paddedMoney}\t${paddedSecurity}\t\t${paddedTime}`);
    }
    
    // If we have a best target, return it
    if (serverScores.length > 0) {
        return serverScores[0].server;
    }
    
    return null;
} 