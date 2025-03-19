Use this software at your own risk; consult the DISCLAIMER for more information.

The software is licensed under GNU Lesser General Public License version 2 or later; consult LICENSE.LGPL and LGPL.v2 for more information. If you ever use any of these source files to develop your own versions of this or other software, you must attach a comment with the contents of LGPL.v2 to the beginning of each source file taken from this archive.

The software is likely to compile and work properly on most Linux systems. It should work on macOS and even Windows.

BASIC COMPILATION AND INSTALLATION INSTRUCTIONS

1) Download the newest version of the TON blockchain sources, available at GitHub repository https://github.com/ton-blockchain/ton/ :

    ```
    git clone https://github.com/ton-blockchain/ton.git
    git submodule update --init
    ```

2) Install the newest versions of make, cmake (version 3.0.2 or later), OpenSSL (including C header files), and g++ or clang (or another C++14-compatible compiler as appropriate for your operating system). We strongly recommend installing OpenSSL version 1.1.1 or later for better performance, especially if you intend to run a Full Node or a Validator as well.

3) Suppose that you have fetched the source tree to directory `~/ton`, where `~` is your home directory, and that you have created an empty directory `~/liteclient-build`. Then run the following in a terminal on a Linux system:

    ```
    cd ~/liteclient-build
    cmake ~/ton
    cmake --build . --target lite-client
    ```

    You might also build some extra utilities useful for smart-contract development:

    ```
    cmake --build . --target fift
    cmake --build . --target func
    ```

4) Download the newest configuration file from https://ton-blockchain.github.io/global.config.json for mainnet:

    ```
    wget https://ton-blockchain.github.io/global.config.json
    ```
    
    or from https://ton-blockchain.github.io/testnet-global.config.json for testnet

    ```
    wget https://ton-blockchain.github.io/testnet-global.config.json
    ```

5) Run the Lite Client with config:

    ```
    ./lite-client/lite-client -C global.config.json
    ```

    If everything was installed successfully, the Lite Client will connect to a special server (a full node for the TON Blockchain Network) and will send some queries to the server.
    If you indicate a writeable "database" directory as an extra argument to the client, it will download and save the block and the state corresponding to the newest masterchain block:

    ```
    ./lite-client/lite-client -C global.config.json -D ~/ton-db-dir
    ```

    Basic help info can be obtained by typing `help` into the Lite Client. Type `quit` or press Ctrl-C to exit.

6) Now you can create new smart contracts, examine the state of existing smart contracts, send external messages to smart contracts and so on. You can also use Fift (if you have compiled it) to compile, execute, and debug your smart contracts locally.
