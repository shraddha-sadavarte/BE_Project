// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserRegistry {

    struct User {
        string name;
        string email;
        string faceHashOrIPFS;
        address account;
        bool active;
        uint256 registeredAt;
        uint256 lastUpdated;
    }

    struct Anomaly {
        address user;
        uint256 confidence;
        string reason;
        uint256 timestamp;
    }

    struct LoginEvent {
        address user;
        uint256 confidence;
        uint256 timestamp;
    }

    mapping(address => User) private users;
    mapping(address => bool) private registered;
    mapping(address => LoginEvent[]) private loginHistory;
    mapping(string => address) private emailToWallet;

    // 🔐 NEW: store all registered wallets (FACE-FIRST LOGIN SUPPORT)
    address[] private registeredWallets;

    Anomaly[] public anomalies;

    event UserRegistered(address indexed account, string name, string email, string faceHashOrIPFS);
    event FaceUpdated(address indexed account, string newFaceHashOrIPFS);
    event UserRevoked(address indexed account, uint256 timestamp);
    event AnomalyLogged(address indexed user, uint256 confidence, string reason, uint256 timestamp);
    event LoginRecorded(address indexed user, uint256 confidence, uint256 timestamp);

    modifier onlyRegistered() {
        require(registered[msg.sender], "User not registered");
        _;
    }

    // --------------------------------
    // USER REGISTRATION
    // --------------------------------
    function registerUser(
        string memory _name,
        string memory _email,
        string memory _faceHashOrIPFS
    ) public {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_email).length > 0, "Email required");
        require(bytes(_faceHashOrIPFS).length > 0, "Face data required");
        require(!registered[msg.sender], "Wallet already registered");
        require(emailToWallet[_email] == address(0), "Email already registered");

        users[msg.sender] = User({
            name: _name,
            email: _email,
            faceHashOrIPFS: _faceHashOrIPFS,
            account: msg.sender,
            active: true,
            registeredAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        registered[msg.sender] = true;

        // 🔐 ADD WALLET TO REGISTRY LIST (NEW)
        registeredWallets.push(msg.sender);

        emailToWallet[_email] = msg.sender;

        emit UserRegistered(msg.sender, _name, _email, _faceHashOrIPFS);
    }

    // --------------------------------
    // UPDATE FACE DATA
    // --------------------------------
    function updateFace(string memory _newFaceHashOrIPFS) public onlyRegistered {
        require(bytes(_newFaceHashOrIPFS).length > 0, "New face data required");
        User storage u = users[msg.sender];
        u.faceHashOrIPFS = _newFaceHashOrIPFS;
        u.lastUpdated = block.timestamp;
        emit FaceUpdated(msg.sender, _newFaceHashOrIPFS);
    }

    // --------------------------------
    // REVOKE USER
    // --------------------------------
    function revokeUser() public onlyRegistered {
        users[msg.sender].active = false;
        registered[msg.sender] = false;
        emit UserRevoked(msg.sender, block.timestamp);
    }

    // --------------------------------
    // LOG ANOMALY
    // --------------------------------
    function logAnomaly(uint256 _confidence, string memory _reason) public {
        anomalies.push(Anomaly({
            user: msg.sender,
            confidence: _confidence,
            reason: _reason,
            timestamp: block.timestamp
        }));
        emit AnomalyLogged(msg.sender, _confidence, _reason, block.timestamp);
    }

    // --------------------------------
    // RECORD SUCCESSFUL LOGIN
    // --------------------------------
    function recordLogin(uint256 _confidence) public onlyRegistered {
        loginHistory[msg.sender].push(LoginEvent({
            user: msg.sender,
            confidence: _confidence,
            timestamp: block.timestamp
        }));
        emit LoginRecorded(msg.sender, _confidence, block.timestamp);
    }

    // --------------------------------
    // GET USER DATA
    // --------------------------------
    function getUser(address _account)
        public
        view
        returns (
            string memory name,
            string memory email,
            string memory faceHashOrIPFS,
            address account,
            bool active,
            uint256 registeredAt,
            uint256 lastUpdated
        )
    {
        User memory u = users[_account];
        return (
            u.name,
            u.email,
            u.faceHashOrIPFS,
            u.account,
            u.active,
            u.registeredAt,
            u.lastUpdated
        );
    }

    // --------------------------------
    // GET ALL REGISTERED WALLETS (NEW)
    // --------------------------------
    function getRegisteredWallets() public view returns (address[] memory) {
        return registeredWallets;
    }

    // --------------------------------
    // GET LOGIN HISTORY
    // --------------------------------
    function getLoginHistory(address _account)
        public
        view
        returns (LoginEvent[] memory)
    {
        return loginHistory[_account];
    }

    // --------------------------------
    // GET ALL ANOMALIES
    // --------------------------------
    function getAllAnomalies() public view returns (Anomaly[] memory) {
        return anomalies;
    }

    // --------------------------------
    // CHECK REGISTRATION
    // --------------------------------
    function isRegistered(address _account) public view returns (bool) {
        return registered[_account];
    }
}
