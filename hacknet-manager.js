/** @param {NS} ns */
export async function main(ns) {
    // Constants for upgrade thresholds
    const MIN_UPGRADE_MULTIPLIER = 1.1; // Only upgrade if it provides at least 10% more production
    const MAX_NODES = ns.hacknet.maxNumNodes();
    
    // Disable logging to reduce spam
    ns.disableLog("ALL");
    
    while (true) {
        const money = ns.getServerMoneyAvailable("home");
        const numNodes = ns.hacknet.numNodes();
        
        // Calculate cost-effectiveness for each upgrade type
        let bestUpgrade = { type: null, nodeIndex: null, cost: Infinity, productionIncrease: 0 };
        
        // Check each existing node for upgrade opportunities
        for (let i = 0; i < numNodes; i++) {
            const node = ns.hacknet.getNodeStats(i);
            const currentProduction = node.production;
            
            // Check level upgrade
            const levelCost = ns.hacknet.getLevelUpgradeCost(i, 1);
            const levelProduction = ns.formulas.hacknetNodes.moneyGainRate(
                node.level + 1,
                node.ram,
                node.cores,
                ns.getHacknetMultipliers().production
            );
            const levelIncrease = levelProduction - currentProduction;
            const levelCostEffectiveness = levelIncrease / levelCost;
            
            if (levelCostEffectiveness > bestUpgrade.productionIncrease / bestUpgrade.cost && 
                levelCost <= money && 
                levelIncrease / currentProduction >= MIN_UPGRADE_MULTIPLIER) {
                bestUpgrade = {
                    type: "level",
                    nodeIndex: i,
                    cost: levelCost,
                    productionIncrease: levelIncrease
                };
            }
            
            // Check RAM upgrade
            const ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
            const ramProduction = ns.formulas.hacknetNodes.moneyGainRate(
                node.level,
                node.ram * 2,
                node.cores,
                ns.getHacknetMultipliers().production
            );
            const ramIncrease = ramProduction - currentProduction;
            const ramCostEffectiveness = ramIncrease / ramCost;
            
            if (ramCostEffectiveness > bestUpgrade.productionIncrease / bestUpgrade.cost && 
                ramCost <= money && 
                ramIncrease / currentProduction >= MIN_UPGRADE_MULTIPLIER) {
                bestUpgrade = {
                    type: "ram",
                    nodeIndex: i,
                    cost: ramCost,
                    productionIncrease: ramIncrease
                };
            }
            
            // Check core upgrade
            const coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);
            const coreProduction = ns.formulas.hacknetNodes.moneyGainRate(
                node.level,
                node.ram,
                node.cores + 1,
                ns.getHacknetMultipliers().production
            );
            const coreIncrease = coreProduction - currentProduction;
            const coreCostEffectiveness = coreIncrease / coreCost;
            
            if (coreCostEffectiveness > bestUpgrade.productionIncrease / bestUpgrade.cost && 
                coreCost <= money && 
                coreIncrease / currentProduction >= MIN_UPGRADE_MULTIPLIER) {
                bestUpgrade = {
                    type: "core",
                    nodeIndex: i,
                    cost: coreCost,
                    productionIncrease: coreIncrease
                };
            }
        }
        
        // Check if buying a new node is more cost-effective
        if (numNodes < MAX_NODES) {
            const newNodeCost = ns.hacknet.getPurchaseNodeCost();
            const newNode = ns.hacknet.getNodeStats(numNodes);
            const newNodeProduction = ns.formulas.hacknetNodes.moneyGainRate(
                newNode.level,
                newNode.ram,
                newNode.cores,
                ns.getHacknetMultipliers().production
            );
            const newNodeCostEffectiveness = newNodeProduction / newNodeCost;
            
            if (newNodeCostEffectiveness > bestUpgrade.productionIncrease / bestUpgrade.cost && 
                newNodeCost <= money) {
                bestUpgrade = {
                    type: "new",
                    nodeIndex: numNodes,
                    cost: newNodeCost,
                    productionIncrease: newNodeProduction
                };
            }
        }
        
        // Execute the best upgrade
        if (bestUpgrade.type && bestUpgrade.cost <= money) {
            switch (bestUpgrade.type) {
                case "level":
                    ns.hacknet.upgradeLevel(bestUpgrade.nodeIndex, 1);
                    ns.print(`Upgraded node ${bestUpgrade.nodeIndex} level`);
                    break;
                case "ram":
                    ns.hacknet.upgradeRam(bestUpgrade.nodeIndex, 1);
                    ns.print(`Upgraded node ${bestUpgrade.nodeIndex} RAM`);
                    break;
                case "core":
                    ns.hacknet.upgradeCore(bestUpgrade.nodeIndex, 1);
                    ns.print(`Upgraded node ${bestUpgrade.nodeIndex} cores`);
                    break;
                case "new":
                    ns.hacknet.purchaseNode();
                    ns.print(`Purchased new node ${numNodes}`);
                    break;
            }
        } else {
            // If no upgrades are cost-effective, wait a bit before checking again
            await ns.sleep(1000);
        }
    }
} 