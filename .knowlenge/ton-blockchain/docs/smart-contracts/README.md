# TON smart contracts overview

## TVM

TON smart contracts are executed on their own TON Virtual Machine (TVM).

TVM is built on the stack principle, which makes it efficient and easy to implement.

[Bird's-eye overview](/smart-contracts/tvm_overview.md)

[TVM specification](https://ton-blockchain.github.io/docs/tvm.pdf)

[TVM C++ implementation](https://github.com/ton-blockchain/ton/tree/master/crypto/vm)

## FunC

High-level language **FunC** is used to program smart contracts on TON.

[FunC Overview](/func/overview.md)

[FunC Compiler](/func/overview.md#Compiler)

[FunC Documentation](/func/overview.md#Documentation)

[FunC Toolkit](/func/overview.md#Toolkit)

[FunC Tutorials](/func/overview.md#Tutorials)

[FunC Standard Smart Contracts](/func/overview.md#Standard-Smart-Contracts)

## Smart Contract Guidelines

TON allows you to do anything, but product smart contracts must be followed [smart contract guidelines](https://ton.org/docs/#/howto/smart-contract-guidelines). 

## Fift

Messages to smart contracts are binary data. To construct such messages, you can use one of the [SDKs](https://ton.org/docs/#/apis/) **or** the special programming language Fift.

Since Fift is close to TVM opcodes, it also helps to know the limits of your brain.

[Fift overview article](https://society.ton.org/introduction-to-fift) by TON Society.

[Fift documentation](https://ton-blockchain.github.io/docs/fiftbase.pdf)

**Fift compiler binaries** for Windows, MacOS (Intel), Ubuntu can be downloaded from [TON Auto Builds](https://github.com/ton-blockchain/ton/actions?query=branch%3Amaster+is%3Acompleted).

[Fift compiler source code](https://github.com/ton-blockchain/ton/tree/master/crypto/fift) (read [how to compile](/compile.md#Fift) Fift compiler from sources).

[Fift scripts for standard smart contracts](https://github.com/ton-blockchain/ton/tree/master/crypto/smartcont)


## FAQ

- **Is TVM compatible with EVM?**

   TVM cannot be compatible with the Ethereum Virtual Machine (EVM) because the TON has a different modern architecture (TON asynchronous, Ethereum synchronous).

   [Read more](https://telegra.ph/Its-time-to-try-something-new-Asynchronous-smart-contracts-03-25).

- **Is it possible to write on Solidity for TON?**

   No, you can't write on Solidity for TON. 

   But if you add asynchronous messages to Solidity syntax and the ability to interact with data at a low level, then you get FunC. FunC has a familiar syntax similar to most modern programming languages and is designed specifically for TON.
