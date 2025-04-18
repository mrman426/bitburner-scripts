# Bitburner Scripts

## Getting Started

You can see the servers you can attack with

```sh
run show-servers.js
```

As you get some money buy the TOR router and buy scripts from the darkweb

```sh
connect darkweb;
buy -l;
buy -a;
```

Also purchase servers for more RAM

```sh
run purchase-servers.js --loop
```

You can see the purchased servers with

```sh
run show-purchased-servers.js
```

## Attacking

You can see your attacks with

```sh
run show-attacks.js
```

You can see attack history with

```sh
run report-attacks.js
```

You can download and remove the stats from the attack with

```sh
download data/attacks.txt
rm data/attacks.txt
```

### Attack Phase 1

Take an Algorithms course at rothman university to boost hack level

Hack `n00dles` using

```sh
run deploy-attack.js n00dles --hacked-only --loop
```

### Attack Phase 2

You can attack a bigger target while you build up RAM

```sh
run deploy-wgh.js --purchased-only --loop
```

### Attack Phase 3

When you have enough RAM you can attack one or more targets in a loop

```sh
run deploy-pro-hwgw.js silver-helix --verbose-hacked --loop
```

## Factions

backdoor these servers

```sh
run show-servers.js CSEC;
run show-servers.js avmnite-02h;
run show-servers.js I.I.I.I;
run show-servers.js run4theh111z;
```

To share memory with your faction

```sh
run deploy-share.js
```

You can see the current shares using

```sh
run show-shares.js
```

## Hacknet

To automatically purchase hacknet nodes (requires `Formulas.exe`)

```sh
run purchase-hacknet.js --loop
```

## Remote Files

Install with this command

```
npx bitburner-filesync
```

https://github.com/bitburner-official/bitburner-filesync

### Setting up NPM

Follow this guide:

https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows

When you run NPM if you get this error:

```
npm : File C:\nvm4w\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For more
information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
```

You need to run this

```
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

See this page for more information

https://stackoverflow.com/questions/57673913/vsc-powershell-after-npm-updating-packages-ps1-cannot-be-loaded-because-runnin