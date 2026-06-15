// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Canteen {
    // ── Scheduling types (V1, unchanged) ──
    struct Member {
        string imageName;
        bool active;
    }

    struct Image {
        uint replicas;
        uint deployed;
        bool active;
    }

    // ── Filecoin deal types (V2) ──
    enum DealState { Proposed, Active, Expired, Slashed }

    struct StorageDeal {
        string cid;
        uint size;
        uint duration;
        string providerId;
        DealState state;
        uint timestamp;
        string imageName;
    }

    address public owner;
    uint public dealCount;
    mapping(uint => StorageDeal) public deals;
    mapping(bytes32 => uint[]) private dealIdsForImage;

    // ── Scheduling state (V1, unchanged) ──
    mapping(bytes32 => Member) memberDetails;
    string[] public members;
    mapping(bytes32 => Image) imageDetails;
    string[] public images;
    mapping (bytes32 => uint[2][]) exposedPortsForImages;
    uint MULT = 100000;

    // ── Events ──
    event MemberJoin(string host);
    event MemberLeave(string host);
    event MemberImageUpdate(string host, string image);
    event DealProposed(uint indexed dealId, string cid, uint size, uint duration, string imageName);
    event DealAnchored(uint indexed dealId, string providerId);
    event DealExpired(uint indexed dealId);
    event DealSlashed(uint indexed dealId);

    modifier restricted() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addMember(string memory host) public restricted {
        bytes32 hashedHost = keccak256(abi.encodePacked(host));
        require(!memberDetails[hashedHost].active, "Member already active");
        members.push(host);
        memberDetails[hashedHost] = Member("", true);
        emit MemberJoin(host);
        setImageForMember(host);
    }

    function removeMember(string memory host) public restricted {
        bytes32 hashedHost = keccak256(abi.encodePacked(host));
        require(memberDetails[hashedHost].active, "Member not active");
        string memory affectedImage = memberDetails[hashedHost].imageName;
        imageDetails[keccak256(abi.encodePacked(affectedImage))].deployed -= 1;
        memberDetails[hashedHost] = Member("", false);
        emit MemberLeave(host);
        rebalanceWithUnfortunateImage(affectedImage);
    }

    function addImage(string memory name, uint replicas) public restricted {
        bytes32 hashedName = keccak256(abi.encodePacked(name));
        require(!imageDetails[hashedName].active, "Image already active");
        require(bytes(name).length > 0, "Image name cannot be empty");
        require(replicas > 0, "Replicas must be greater than 0");
        images.push(name);
        imageDetails[hashedName] = Image(replicas, 0, true);
        rebalanceWithUnfortunateImage(name);
    }

    function addImageWithDeal(string memory name, uint replicas, string memory cid, uint size, uint duration) public restricted {
        addImage(name, replicas);
        _proposeDeal(cid, size, duration, name);
    }

    function removeImage(string memory name) public restricted {
        bytes32 hashedName = keccak256(abi.encodePacked(name));
        require(imageDetails[hashedName].active, "Image not active");
        imageDetails[hashedName].active = false;
        for (uint i = 0; i < members.length; i++) {
            Member storage member = memberDetails[keccak256(abi.encodePacked(members[i]))];
            if (member.active && keccak256(abi.encodePacked(member.imageName)) == hashedName) {
                member.imageName = "";
                setImageForMember(members[i]);
            }
        }
    }

    function addPortForImage(string memory name, uint from, uint to) public restricted {
        exposedPortsForImages[keccak256(abi.encodePacked(name))].push([from, to]);
    }

    function getPortsForImage(string memory name) public view restricted returns (uint[2][] memory) {
        return exposedPortsForImages[keccak256(abi.encodePacked(name))];
    }

    function getMemberDetails(string memory host) public view returns (string memory, bool) {
        Member storage details = memberDetails[keccak256(abi.encodePacked(host))];
        return (details.imageName, details.active);
    }

    function getImageDetails(string memory name) public view returns (uint, uint, bool) {
        Image storage details = imageDetails[keccak256(abi.encodePacked(name))];
        return (details.replicas, details.deployed, details.active);
    }

    // ── Deal functions (V2) ──

    function proposeDeal(string memory cid, uint size, uint duration, string memory imageName) public restricted {
        _proposeDeal(cid, size, duration, imageName);
    }

    function _proposeDeal(string memory cid, uint size, uint duration, string memory imageName) private {
        require(bytes(cid).length > 0, "CID cannot be empty");
        require(size > 0, "Size must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        dealCount++;
        deals[dealCount] = StorageDeal(cid, size, duration, "", DealState.Proposed, block.timestamp, imageName);
        dealIdsForImage[keccak256(abi.encodePacked(imageName))].push(dealCount);
        emit DealProposed(dealCount, cid, size, duration, imageName);
    }

    function anchorDeal(uint dealId, string memory providerId) public restricted {
        require(dealId > 0 && dealId <= dealCount, "Invalid deal ID");
        require(deals[dealId].state == DealState.Proposed, "Deal not in Proposed state");
        require(bytes(providerId).length > 0, "Provider ID cannot be empty");
        deals[dealId].state = DealState.Active;
        deals[dealId].providerId = providerId;
        emit DealAnchored(dealId, providerId);
    }

    function expireDeal(uint dealId) public restricted {
        require(dealId > 0 && dealId <= dealCount, "Invalid deal ID");
        require(deals[dealId].state == DealState.Active, "Deal not Active");
        deals[dealId].state = DealState.Expired;
        emit DealExpired(dealId);
    }

    function slashDeal(uint dealId) public restricted {
        require(dealId > 0 && dealId <= dealCount, "Invalid deal ID");
        require(deals[dealId].state == DealState.Active, "Deal not Active");
        deals[dealId].state = DealState.Slashed;
        emit DealSlashed(dealId);
    }

    function getDeal(uint dealId) public view returns (string memory cid, uint size, uint duration, string memory providerId, DealState state, uint timestamp, string memory imageName) {
        require(dealId > 0 && dealId <= dealCount, "Invalid deal ID");
        StorageDeal storage d = deals[dealId];
        return (d.cid, d.size, d.duration, d.providerId, d.state, d.timestamp, d.imageName);
    }

    function getDealsForImage(string memory imageName) public view returns (uint[] memory) {
        return dealIdsForImage[keccak256(abi.encodePacked(imageName))];
    }

    function getActiveDealForImage(string memory imageName) public view returns (uint dealId, string memory cid, uint size, string memory providerId) {
        uint[] storage ids = dealIdsForImage[keccak256(abi.encodePacked(imageName))];
        for (uint i = ids.length; i > 0; i--) {
            StorageDeal storage d = deals[ids[i - 1]];
            if (d.state == DealState.Active) {
                return (ids[i - 1], d.cid, d.size, d.providerId);
            }
        }
        return (0, "", 0, "");
    }

    function rebalanceWithUnfortunateImage(string memory newImageName) private {
        Image storage newImage = imageDetails[keccak256(abi.encodePacked(newImageName))];
        uint currentRatio = 0;
        uint i;
        Member storage member;
        for (i = 0; i < members.length; i++) {
            if (newImage.deployed >= newImage.replicas)
                break;
            member = memberDetails[keccak256(abi.encodePacked(members[i]))];
            if (member.active && keccak256(abi.encodePacked(member.imageName)) == keccak256(abi.encodePacked(""))) {
                member.imageName = newImageName;
                newImage.deployed += 1;
                currentRatio += (MULT / newImage.replicas);
                emit MemberImageUpdate(members[i], newImageName);
            }
        }
        for (i = 0; i < members.length; i++) {
            if (newImage.deployed >= newImage.replicas)
                break;
            member = memberDetails[keccak256(abi.encodePacked(members[i]))];
            if (member.active && keccak256(abi.encodePacked(member.imageName)) != keccak256(abi.encodePacked(""))) {
                if (keccak256(abi.encodePacked(member.imageName)) != keccak256(abi.encodePacked(newImageName))) {
                    Image storage image = imageDetails[keccak256(abi.encodePacked(member.imageName))];
                    uint ratio = (image.deployed * MULT) / image.replicas;
                    if (ratio > currentRatio) {
                        member.imageName = newImageName;
                        newImage.deployed += 1;
                        image.deployed -= 1;
                        currentRatio += (MULT / newImage.replicas);
                        emit MemberImageUpdate(members[i], newImageName);
                    }
                }
            }
        }
    }

    function setImageForMember(string memory host) private {
        string memory image = getNextImageToUse();
        bytes32 hashedHost = keccak256(abi.encodePacked(host));
        bytes32 hashedImage = keccak256(abi.encodePacked(image));
        if (hashedImage == keccak256(abi.encodePacked(""))) {
            return;
        }
        require(keccak256(abi.encodePacked(memberDetails[hashedHost].imageName)) == keccak256(abi.encodePacked("")), "Member already has an image");
        require(imageDetails[hashedImage].deployed < imageDetails[hashedImage].replicas, "Image has reached replica limit");
        memberDetails[hashedHost] = Member(image, true);
        imageDetails[hashedImage].deployed += 1;
        emit MemberImageUpdate(host, image);
    }

    function getNextImageToUse() private view returns (string memory) {
        string memory bestImage = "";
        uint lowestUsage = MULT;
        for (uint i = 0; i < images.length; i++) {
            bytes32 hash = keccak256(abi.encodePacked(images[i]));
            Image storage image = imageDetails[hash];
            if (image.deployed >= image.replicas)
                continue;
            if (image.active && image.deployed < lowestUsage * image.replicas) {
                lowestUsage = (image.deployed * MULT) / image.replicas;
                bestImage = images[i];
            }
        }
        return bestImage;
    }

    function getMembersCount() public view returns (uint) {
        return members.length;
    }

    function getImages() public view returns (string[] memory) {
        return images;
    }

    function getImagesCount() public view returns (uint) {
        return images.length;
    }
}
