// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserRegistry {
    struct User {
        string name;
        string email;
        string faceHashOrIPFS; // Store SHA256 hash or IPFS CID
        address account;
    }

    mapping(address => User) private users;
    mapping(address => bool) private registered; // track registration

    event UserRegistered(address indexed account, string name,string email, string faceHashOrIPFS);
    event FaceUpdated(address indexed account, string newFaceHashOrIPFS);

    modifier onlyRegistered() {
        require(registered[msg.sender], "User not registered");
        _;
    }

    function registerUser(
        string memory _name,
        string memory _email,
        string memory _faceHashOrIPFS
    ) public {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_email).length > 0, "Email required");
        require(bytes(_faceHashOrIPFS).length > 0, "Face data required");
        require(!registered[msg.sender], "User already registered");

        users[msg.sender] = User({
            name: _name,
            email: _email,
            faceHashOrIPFS: _faceHashOrIPFS,
            account: msg.sender
        });

        registered[msg.sender] = true;

        emit UserRegistered(msg.sender, _name,_email, _faceHashOrIPFS);
    }

    /// @notice Update face hash/IPFS CID if user wants to re-enroll
    function updateFace(string memory _newFaceHashOrIPFS) public onlyRegistered {
        require(bytes(_newFaceHashOrIPFS).length > 0, "New face data required");

        users[msg.sender].faceHashOrIPFS = _newFaceHashOrIPFS;

        emit FaceUpdated(msg.sender, _newFaceHashOrIPFS);
    }

    /// @notice Get user details
    function getUser(address _account) public view returns (
        string memory name,
        string memory email,
        string memory faceHashOrIPFS,
        address account
    ) {
        User memory u = users[_account];
        return (u.name, u.email, u.faceHashOrIPFS, u.account);
    }

    /// @notice Check if a wallet is registered
    function isRegistered(address _account) public view returns (bool) {
        return registered[_account];
    }
}
