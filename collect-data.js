/** @param {NS} ns */
export async function main(ns) {
    const dataPort = ns.getPortHandle(1)
    const filename = '/data/attacks.txt'

    if (!ns.fileExists(filename)) {
        await ns.write(filename, "datetime;startTime;host;target;type;threads;securityLevel;moneyAvailable;moneyHacked\n", 'w')
    }

    while (true) {
        if (!dataPort.empty()) {
            while (!dataPort.empty()) {
                const rawData = dataPort.read()
                const data = JSON.parse(rawData)

                // Convert object to a single CSV row (data only)
                if (typeof data === 'object' && !Array.isArray(data)) {
                    const csvData = Object.values(data).join(";")
                    ns.print(`received data: ${csvData}`)
                    await ns.write(filename, csvData + "\n", 'a')
                } else {
                    ns.print(`Unexpected data format: ${rawData}`)
                }
            }
        } else {
            await ns.sleep(1000)
        }
    }
}