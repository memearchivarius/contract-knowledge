# Nominators

With TON smart contracts, you can implement any staking and deposit mechanics you want.

However, there is "native staking" in TON Blockchain - you can lend Toncoins to validators for stake and share the reward for validation.

The one who lends to validator is called the **nominator**.

A smart contract, called a **nominator pool**, provides the ability for one or more nominators to lend Toncoins in a validator stake, and ensures that the validator can use those Toncoins only for validation. Also, the smart contract guarantees the distribution of the reward.

[Nominator Pool smart contract source code](https://github.com/ton-blockchain/nominator-pool)

[Pools catalog](https://tonvalidators.org/)

The theory of nominators is described in [TON Whitepaper](https://ton.org/docs/ton.pdf), chapters 2.6.3, 2.6.25.