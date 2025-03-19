# TON DNS

TON DNS is a service for translating human-readable domain names (such as `test.ton` or `mysite.temp.ton`) into TON smart contract addresses, ADNL addresses employed by services running in the TON Network (such as TON Sites), and so on.

## Standard

[TON DNS Standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0081-dns-standard.md) describes the format of domain names, the process of resolving a domain, the interface of DNS smart contracts and the format of DNS records.

## SDK

Working with TON DNS is implemented in JavaScript SDK [TonWeb](https://github.com/toncenter/tonweb) and [TonLib](https://ton.org/docs/#/apis/?id=_2-ton-api).

```js
const address: Address = await tonweb.dns.getWalletAddress('test.ton');

// or 

const address: Address = await tonweb.dns.resolve('test.ton', TonWeb.dns.DNS_CATEGORY_WALLET);
```

Also [lite-client](/compile#lite-client) and [tonlib-cli](/compile#tonlib-cli) is supported DNS queries from revision `35d1724`.

**lite-client:** 

`dnsresolve [<block-id-ext>] <domain> [<category>]` 

for example:

`dnsresolve just-for-test.ton wallet`

**tonlib-cli:** 

`dns resolve (<addr> | root) <name> <category>` 

for example: 

`dns resolve root just-for-test.ton wallet`

## First-level domain

Currently, only domains ending in `.ton` are recognized as valid TON DNS domains. 

Root DNS smart contract source code - https://github.com/ton-blockchain/dns-contract/blob/main/func/root-dns.fc.

This could change in the future. Adding a new first-level domain will require new root smart contract and general vote to change the [network config #4](https://ton.org/docs/#/smart-contracts/governance?id=config).

## *.ton domains

*.ton domains implemented in the form of NFT. Since they implement the NFT standard, they are compatible with regular NFT services (e.g. NFT marketplaces) and wallets that can display NFT.

*.ton domains source code - https://github.com/ton-blockchain/dns-contract.

.ton domains resolver implements NFT collection interface and .ton domain implements NFT item interface.

Primary sale of *.ton domains is available at a decentralized open auction https://dns.ton.org. Source code - https://github.com/ton-blockchain/dns.

## Subdomains

The domain owner can make subdomains by setting the address of the smart contract responsible for resolving subdomains in the DNS record `sha256("dns_next_resolver")`.

It can be any smart contract that implements the DNS standard.
