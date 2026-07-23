const { BN } = require('web3-utils');
const Canteen = artifacts.require("Canteen");
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const should = chai.should();

contract('Canteen', accounts => {
  let canteen = null;
  const owner = accounts[0];
  const purchaser = accounts[1];

  beforeEach(async function() {
    canteen = await Canteen.new({ from: owner, gas: 3000000 });
  });

  it('initial state', async function() {
    const members = await canteen.getMembersCount();
    const images = await canteen.getImagesCount();

    new BN(members).eq(new BN(0)).should.be.true;
    new BN(images).eq(new BN(0)).should.be.true;
  });

  describe('Hosts and Images:', () => {
    var details;

    it('test suite 1', async function() {
      await canteen.addMember("host1");
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("");
      details[1].should.be.equal(true);

      await canteen.addImage("img1", 2);
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("img1");

      await canteen.addMember("host2");
      details = await canteen.getMemberDetails("host2");
      details[0].should.be.equal("img1");
      details[1].should.be.equal(true);

      await canteen.addMember("host3");
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("");
      details[1].should.be.equal(true);

      await canteen.removeMember("host2");
      details = await canteen.getMemberDetails("host2");
      details[0].should.be.equal("");
      details[1].should.be.equal(false);
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("img1");

      await canteen.addImage("img2", 2);
      const images = await canteen.getImagesCount();
      new BN(images).eq(new BN(2)).should.be.true;
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("img2");
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("img1");

      await canteen.removeImage("img1");
      details = await canteen.getMemberDetails("host1");
      details[0].should.be.equal("img2");
      details = await canteen.getMemberDetails("host3");
      details[0].should.be.equal("img2");
    });
  });

  describe('Adding Ports and Image Details:', () => {
    var details;

    it('test suite 1', async function() {
      await canteen.addImage("image1", 2);
      details = await canteen.getImageDetails("image1");
      new BN(details[0]).eq(new BN(2)).should.be.true;
      new BN(details[1]).eq(new BN(0)).should.be.true;
      details[2].should.be.equal(true);

      await canteen.addPortForImage("image1", 8080, 80);
      details = await canteen.getPortsForImage("image1");
      new BN(details[0][0]).eq(new BN(8080)).should.be.true;
      new BN(details[0][1]).eq(new BN(80)).should.be.true;

      await canteen.addPortForImage("image1", 5000, 50);
      details = await canteen.getPortsForImage("image1");
      new BN(details[1][0]).eq(new BN(5000)).should.be.true;
      new BN(details[1][1]).eq(new BN(50)).should.be.true;
    });
  });

  describe('Status Reporting:', () => {
    it('should report and read node status', async function() {
      await canteen.addMember("host1");

      const status = await canteen.getMemberStatus("host1");
      status[0].should.be.equal('');
      status[1].should.be.equal('');

      await canteen.reportStatus("host1", "nginx:latest", "running");

      const updatedStatus = await canteen.getMemberStatus("host1");
      updatedStatus[0].should.be.equal('nginx:latest');
      updatedStatus[1].should.be.equal('running');
      new BN(updatedStatus[2]).toNumber().should.be.above(0);
    });

    it('should emit StatusReport event', async function() {
      await canteen.addMember("host1");

      const tx = await canteen.reportStatus("host1", "nginx:latest", "running");
      tx.logs[0].event.should.equal('StatusReport');
      tx.logs[0].args.host.should.equal('host1');
      tx.logs[0].args.image.should.equal('nginx:latest');
      tx.logs[0].args.state.should.equal('running');
    });

    it('should reject status from non-member', async function() {
      await canteen.reportStatus("unknown-host", "nginx:latest", "running")
        .should.be.rejectedWith('revert');
    });

    it('should clear status when member is removed', async function() {
      await canteen.addMember("host1");
      await canteen.reportStatus("host1", "nginx:latest", "running");

      const before = await canteen.getMemberStatus("host1");
      before[0].should.be.equal('nginx:latest');

      await canteen.removeMember("host1");

      const after = await canteen.getMemberStatus("host1");
      after[0].should.be.equal('');
      after[1].should.be.equal('');
    });

    it('getNodeCount should return active members', async function() {
      const countBefore = await canteen.getNodeCount();
      new BN(countBefore).eq(new BN(0)).should.be.true;

      await canteen.addMember("host1");
      await canteen.addMember("host2");

      const countAfter = await canteen.getNodeCount();
      new BN(countAfter).eq(new BN(2)).should.be.true;

      await canteen.removeMember("host1");
      const countRemoved = await canteen.getNodeCount();
      new BN(countRemoved).eq(new BN(1)).should.be.true;
    });
  });
});
