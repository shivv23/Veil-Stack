import { BN } from 'web3-utils';
const Canteen = artifacts.require("Canteen");

contract('Canteen', accounts => {
  let canteen = null;
  const owner = accounts[0];
  const purchaser = accounts[1];
  let chai, should;

  before(async () => {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    should = chai.should();
  });

  beforeEach(async function() {
    canteen = await Canteen.new({ from: owner, gas: 3000000 });
  });

  it('initial state', async function() {
    const members = await canteen.getMembersCount();
    const images = await canteen.getImagesCount();
    const dealCount = await canteen.dealCount();
    new BN(members).eq(new BN(0)).should.be.true;
    new BN(images).eq(new BN(0)).should.be.true;
    new BN(dealCount).eq(new BN(0)).should.be.true;
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

  describe('Access Control:', () => {
    it('rejects non-owner addMember', async function() {
      try {
        await canteen.addMember("unauthorized", { from: purchaser });
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert');
      }
    });

    it('rejects non-owner addImage', async function() {
      try {
        await canteen.addImage("img", 1, { from: purchaser });
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert');
      }
    });

    it('rejects non-owner proposeDeal', async function() {
      try {
        await canteen.proposeDeal("QmTest", 256000, 518400, "img", { from: purchaser });
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert');
      }
    });

    it('rejects non-owner anchorDeal', async function() {
      try {
        await canteen.anchorDeal(1, "f01234", { from: purchaser });
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert');
      }
    });
  });

  describe('Input Validation:', () => {
    it('rejects empty image name', async function() {
      try {
        await canteen.addImage("", 1);
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert for empty name');
      }
    });

    it('rejects zero replicas', async function() {
      try {
        await canteen.addImage("img", 0);
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert for zero replicas');
      }
    });

    it('rejects duplicate member registration', async function() {
      await canteen.addMember("host1");
      try {
        await canteen.addMember("host1");
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert for duplicate member');
      }
    });

    it('rejects empty CID in proposeDeal', async function() {
      try {
        await canteen.proposeDeal("", 256000, 518400, "img");
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert for empty CID');
      }
    });

    it('rejects zero size in proposeDeal', async function() {
      try {
        await canteen.proposeDeal("QmTest", 0, 518400, "img");
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert for zero size');
      }
    });

    it('rejects zero duration in proposeDeal', async function() {
      try {
        await canteen.proposeDeal("QmTest", 256000, 0, "img");
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert for zero duration');
      }
    });
  });

  describe('View Functions:', () => {
    it('getImages returns registered images', async function() {
      await canteen.addMember("host1");
      await canteen.addImage("alpha", 1);
      await canteen.addImage("beta", 2);
      const images = await canteen.getImages();
      assert(images.includes("alpha"), 'alpha should be in images');
      assert(images.includes("beta"), 'beta should be in images');
      assert.equal(images.length, 2, 'Should have 2 images');
    });

    it('getImagesCount returns correct count', async function() {
      const count0 = await canteen.getImagesCount();
      new BN(count0).eq(new BN(0)).should.be.true;
      await canteen.addImage("x", 1);
      const count1 = await canteen.getImagesCount();
      new BN(count1).eq(new BN(1)).should.be.true;
    });
  });

  describe('Deal Lifecycle:', () => {
    it('proposeDeal creates a storage deal', async function() {
      await canteen.proposeDeal("QmTestCID123", 256000, 518400, "img1");
      const dealCount = await canteen.dealCount();
      new BN(dealCount).eq(new BN(1)).should.be.true;
      const deal = await canteen.getDeal(1);
      deal[0].should.be.equal("QmTestCID123"); // cid
      new BN(deal[1]).eq(new BN(256000)).should.be.true; // size
      new BN(deal[2]).eq(new BN(518400)).should.be.true; // duration
      deal[3].should.be.equal(""); // providerId (empty until anchored)
      new BN(deal[4]).eq(new BN(0)).should.be.true; // Proposed state
      deal[6].should.be.equal("img1"); // imageName
    });

    it('addImageWithDeal creates image + deal in one call', async function() {
      await canteen.addImageWithDeal("nginx", 2, "QmNginxCID", 512000, 259200);
      const images = await canteen.getImagesCount();
      new BN(images).eq(new BN(1)).should.be.true;
      const image = await canteen.getImageDetails("nginx");
      new BN(image[0]).eq(new BN(2)).should.be.true; // replicas
      const dealCount = await canteen.dealCount();
      new BN(dealCount).eq(new BN(1)).should.be.true;
      const deal = await canteen.getDeal(1);
      deal[0].should.be.equal("QmNginxCID");
      deal[6].should.be.equal("nginx");
    });

    it('anchors a proposed deal', async function() {
      await canteen.proposeDeal("QmTest", 256000, 518400, "img1");
      await canteen.anchorDeal(1, "f012345");
      const deal = await canteen.getDeal(1);
      new BN(deal[4]).eq(new BN(1)).should.be.true; // Active state
      deal[3].should.be.equal("f012345"); // providerId
    });

    it('rejects anchor on non-Proposed deal', async function() {
      await canteen.proposeDeal("QmTest", 256000, 518400, "img1");
      await canteen.anchorDeal(1, "f012345");
      try {
        await canteen.anchorDeal(1, "f06789");
        assert.fail('Should have thrown');
      } catch (e) {
        assert(e.message.includes('revert'), 'Expected revert');
      }
    });

    it('expires an active deal', async function() {
      await canteen.proposeDeal("QmTest", 256000, 518400, "img1");
      await canteen.anchorDeal(1, "f012345");
      await canteen.expireDeal(1);
      const deal = await canteen.getDeal(1);
      new BN(deal[4]).eq(new BN(2)).should.be.true; // Expired state
    });

    it('slashes an active deal', async function() {
      await canteen.proposeDeal("QmTest", 256000, 518400, "img1");
      await canteen.anchorDeal(1, "f012345");
      await canteen.slashDeal(1);
      const deal = await canteen.getDeal(1);
      new BN(deal[4]).eq(new BN(3)).should.be.true; // Slashed state
    });

    it('getDealsForImage returns deal IDs for an image', async function() {
      await canteen.proposeDeal("QmA", 1000, 100, "img1");
      await canteen.proposeDeal("QmB", 2000, 200, "img1");
      await canteen.proposeDeal("QmC", 3000, 300, "img2");
      const img1Deals = await canteen.getDealsForImage("img1");
      assert.equal(img1Deals.length, 2, 'img1 should have 2 deals');
      new BN(img1Deals[0]).eq(new BN(1)).should.be.true;
      new BN(img1Deals[1]).eq(new BN(2)).should.be.true;
      const img2Deals = await canteen.getDealsForImage("img2");
      assert.equal(img2Deals.length, 1, 'img2 should have 1 deal');
    });

    it('getActiveDealForImage returns the latest active deal', async function() {
      await canteen.proposeDeal("QmExpired", 1000, 100, "img1");
      await canteen.anchorDeal(1, "f01234");
      await canteen.expireDeal(1);
      await canteen.proposeDeal("QmActive", 2000, 200, "img1");
      await canteen.anchorDeal(2, "f05678");
      const active = await canteen.getActiveDealForImage("img1");
      new BN(active[0]).eq(new BN(2)).should.be.true; // dealId
      active[1].should.be.equal("QmActive"); // cid
    });
  });
});
