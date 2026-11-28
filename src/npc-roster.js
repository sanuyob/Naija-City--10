const RAW_ROSTER = [
  ['alimosho','gobkit-human001-pack','Cashier','Retail cashier','retail-clerk','adire-apron',[7,20]],
  ['alimosho','gobkit-human001-pack','FoodCourier','Food courier','delivery-rider','courier-vest',[7,22]],
  ['alimosho','gobkit-human001-pack','Shoplifter','Street shopper','shopper','ankara-casual',[10,21]],
  ['alimosho','gobkit-human001-pack','StockClerk','Street cleaner','cleaner','sanitation-green',[5,17]],
  ['alimosho','gobkit-human001-pack','StoreManager','Shop manager','store-manager','smart-casual',[8,20]],
  ['alimosho','gobkit-human015-pack','DeliveryRider','Dispatch rider','delivery-rider','courier-vest',[7,22]],
  ['alimosho','gobkit-human015-pack','Firefighter','Emergency responder','emergency','responder-uniform',[0,24]],
  ['alimosho','gobkit-human015-pack','HeadChef','Roadside food cook','chef','market-apron',[6,18]],
  ['alimosho','gobkit-human015-pack','HotDogVendor','Roadside food vendor','vendor','adire-apron',[6,20]],
  ['alimosho','gobkit-human015-pack','OfficeWorker','Local office worker','office-worker','smart-casual',[8,18]],
  ['alimosho','gobkit-human017-pack','MarketVendor','Market trader','vendor','ankara-market',[6,19]],

  ['lekki','gobkit-human002-pack','SecurityGuard','Estate security officer','security','security-uniform',[0,24]],
  ['lekki','gobkit-human019-pack','ArtTeacher','Art teacher','teacher','adire-smart',[8,17]],
  ['lekki','gobkit-human019-pack','BandDrummer','Community band drummer','entertainer','performance-wear',[12,20]],
  ['lekki','gobkit-human019-pack','Cheerleader','School sports performer','student','school-sports',[8,17]],
  ['lekki','gobkit-human019-pack','ClassTeacher','Class teacher','teacher','school-smart',[7,17]],
  ['lekki','gobkit-human019-pack','HomeroomTeacher','Homeroom teacher','teacher','school-smart',[7,17]],
  ['lekki','gobkit-human019-pack','SchoolPrincipal','School principal','school-admin','school-formal',[7,17]],
  ['lekki','gobkit-human019-pack','Schoolboy','School pupil','student','school-uniform',[7,17]],
  ['lekki','gobkit-human019-pack','Schoolgirl','School pupil','student','school-uniform',[7,17]],
  ['lekki','gobkit-human021-pack','Bartender','Hotel bartender','hospitality','service-apron',[15,24]],
  ['lekki','gobkit-human021-pack','FloorManager','Restaurant floor manager','hospitality','smart-service',[10,23]],
  ['lekki','gobkit-human021-pack','Pizzaiolo','Restaurant cook','chef','chef-apron',[9,23]],
  ['lekki','gobkit-human021-pack','RestaurantGuest','Restaurant guest','customer','ankara-casual',[11,23]],
  ['lekki','gobkit-human021-pack','Waitress','Restaurant server','hospitality','service-apron',[9,23]],

  ['victoriaIsland','gobkit-human002-pack','Accountant','Corporate accountant','office-worker','office-formal',[8,18]],
  ['victoriaIsland','gobkit-human002-pack','CompanyCeo','Company executive','executive','office-formal',[8,18]],
  ['victoriaIsland','gobkit-human002-pack','ItEngineer','IT technician','it-technician','tech-smart',[8,19]],
  ['victoriaIsland','gobkit-human002-pack','OfficeIntern','Office intern','office-worker','smart-casual',[8,18]],
  ['victoriaIsland','gobkit-human002-pack','OfficeManager','Office manager','office-worker','office-formal',[8,18]],
  ['victoriaIsland','gobkit-human002-pack','Receptionist','Office receptionist','receptionist','office-smart',[7,18]],
  ['victoriaIsland','gobkit-human002-pack','SalesRep','Sales representative','sales-rep','office-smart',[8,19]],
  ['victoriaIsland','gobkit-human020-pack','LandSurveyor','Land surveyor','site-worker','field-workwear',[7,18]],
  ['victoriaIsland','gobkit-human020-pack','SiteBricklayer','Building craft worker','artisan','workwear',[7,18]],
  ['victoriaIsland','gobkit-human020-pack','SitePainter','Building painter','artisan','workwear',[7,18]],
  ['victoriaIsland','gobkit-human021-pack','Dishwasher','Kitchen steward','hospitality','service-apron',[8,23]],
  ['victoriaIsland','gobkit-human021-pack','ExecutiveChef','Executive chef','chef','chef-apron',[8,23]],
  ['victoriaIsland','gobkit-human021-pack','SousChef','Sous chef','chef','chef-apron',[8,23]],

  ['ekoAtlantic','gobkit-human008-pack','AirTraveller','Waterfront visitor','passenger','ankara-casual',[8,21]],
  ['ekoAtlantic','gobkit-human008-pack','AirlineCaptain','Transport operations captain','transport-operator','transport-uniform',[6,18]],
  ['ekoAtlantic','gobkit-human008-pack','BaggageHandler','Cargo handler','logistics-worker','high-vis-workwear',[6,20]],
  ['ekoAtlantic','gobkit-human008-pack','CabinAttendant','Passenger services attendant','hospitality','service-uniform',[7,20]],
  ['ekoAtlantic','gobkit-human008-pack','CustomsOfficer','Port inspection officer','checkpoint-security','official-uniform',[0,24]],
  ['ekoAtlantic','gobkit-human008-pack','RampAgent','Marina ground crew','logistics-worker','high-vis-workwear',[6,20]],
  ['ekoAtlantic','gobkit-human008-pack','RampMarshaller','Vehicle movement marshal','logistics-worker','high-vis-workwear',[6,20]],
  ['ekoAtlantic','gobkit-human008-pack','SecurityScreener','Port security screener','checkpoint-security','security-uniform',[0,24]],
  ['ekoAtlantic','gobkit-human020-pack','CraneOperator','Crane operator','site-worker','hardhat-workwear',[7,18]],
  ['ekoAtlantic','gobkit-human020-pack','SiteCarpenter','Site carpenter','artisan','hardhat-workwear',[7,18]],
  ['ekoAtlantic','gobkit-human020-pack','SiteEngineer','Construction site engineer','site-engineer','hardhat-workwear',[7,18]],
  ['ekoAtlantic','gobkit-human020-pack','SiteForeman','Construction foreman','site-engineer','hardhat-workwear',[7,18]],
  ['ekoAtlantic','gobkit-human020-pack','SiteWelder','Site welder','artisan','hardhat-workwear',[7,18]],

  ['ekiti','gobkit-human001-pack','GrandmaShopper','Ekiti elder and shopper','shopper','yoruba-casual',[8,19]],
  ['ekiti','gobkit-human001-pack','OfficeLady','Community office worker','office-worker','adire-smart',[8,17]],
  ['ekiti','gobkit-human001-pack','Schoolkid','School pupil','student','school-uniform',[7,17]],
  ['ekiti','gobkit-human015-pack','PoliceOfficer','Community police officer','security','police-uniform',[0,24]],
  ['ekiti','gobkit-human015-pack','StreetMime','Street performer','entertainer','performance-wear',[12,20]],
  ['ekiti','gobkit-human015-pack','Student','Secondary school student','student','school-uniform',[7,17]],
  ['ekiti','gobkit-human017-pack','CornHarvester','Crop farmer','farmer','farm-workwear',[6,18]],
  ['ekiti','gobkit-human017-pack','FarmHand','Smallholder farmer','farmer','farm-workwear',[6,18]],
  ['ekiti','gobkit-human017-pack','FarmOwner','Farm owner','farmer','yoruba-farmwear',[6,18]],
  ['ekiti','gobkit-human017-pack','PumpkinGrower','Vegetable grower','farmer','farm-workwear',[6,18]],
  ['ekiti','gobkit-human017-pack','Shepherd','Livestock keeper','farmer','farm-workwear',[6,18]],
  ['ekiti','gobkit-human017-pack','SunflowerGrower','Crop grower','farmer','farm-workwear',[6,18]],
  ['ekiti','gobkit-human017-pack','TractorDriver','Farm equipment operator','farmer','farm-workwear',[6,18]]
];

const ANCHORS = Object.freeze({
  alimosho: { axis: 'x', span: [-346, -326], fixed: 454, lane: 1.35 },
  lekki: { axis: 'z', span: [318, 338], fixed: 319, lane: 1.35 },
  victoriaIsland: { axis: 'x', span: [281, 301], fixed: 73, lane: 1.35 },
  ekoAtlantic: { axis: 'x', span: [536, 556], fixed: 78, lane: 1.65 },
  ekiti: { axis: 'z', span: [670, 690], fixed: -312, lane: 1.65 }
});

const LEGACY_IDS = Object.freeze({
  MarketVendor: 'alimosho-market-vendor',
  StockClerk: 'alimosho-street-cleaner',
  DeliveryRider: 'alimosho-delivery-rider',
  SecurityGuard: 'lekki-estate-security',
  Accountant: 'vi-accountant',
  SiteEngineer: 'eko-site-engineer',
  FarmHand: 'ekiti-farm-hand'
});

const LEGACY_SPAWNS = Object.freeze({
  'alimosho-market-vendor': [-252, 0, 390],
  'alimosho-street-cleaner': [-260, 0, 390],
  'alimosho-delivery-rider': [-244, 0, 390],
  'lekki-estate-security': [248, 0, 270],
  'vi-accountant': [250, 0, 45],
  'eko-site-engineer': [500, 0, 45],
  'ekiti-farm-hand': [-250, 0, 650]
});

const slug = value => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const grouped = new Map();
for (const row of RAW_ROSTER) grouped.set(row[0], [...(grouped.get(row[0]) || []), row]);

export const NPC_DEFINITIONS = Object.freeze(RAW_ROSTER.map((row, index) => {
  const [district, pack, model, role, job, outfitStyle, schedule] = row;
  const members = grouped.get(district);
  const localIndex = members.indexOf(row);
  const config = ANCHORS[district];
  const [low, high] = config.span;
  const margin = 0.9;
  const fraction = members.length < 2 ? 0.5 : localIndex / (members.length - 1);
  const along = low + margin + fraction * (high - low - margin * 2);
  const side = localIndex % 2 === 0 ? -1 : 1;
  const fixed = config.fixed + side * config.lane;
  const id = LEGACY_IDS[model] && (
    (model === 'MarketVendor' || model === 'StockClerk' || model === 'DeliveryRider') && district === 'alimosho' ||
    model === 'SecurityGuard' && district === 'lekki' ||
    model === 'Accountant' && district === 'victoriaIsland' ||
    model === 'SiteEngineer' && district === 'ekoAtlantic' ||
    model === 'FarmHand' && district === 'ekiti'
  ) ? LEGACY_IDS[model] : district + '-' + slug(model);
  const generatedSpawn = config.axis === 'x' ? [along, 0, fixed] : [fixed, 0, along];
  const spawn = LEGACY_SPAWNS[id] ? LEGACY_SPAWNS[id].slice() : generatedSpawn;
  const stride = localIndex % 3 === 0 ? 1.4 : 1.0;
  const cross = side * 0.55;
  const route = config.axis === 'x'
    ? [spawn, [along + stride, 0, fixed], [along + stride, 0, fixed + cross], [along, 0, fixed + cross]]
    : [spawn, [fixed, 0, along + stride], [fixed + cross, 0, along + stride], [fixed + cross, 0, along]];

  return Object.freeze({
    id, district, role, job, model, pack, outfitStyle, schedule: Object.freeze(schedule.slice()),
    url: model === 'FarmHand' ? 'assets/npcs/gobkit-cc0/roster/gobkit-human017-pack/farm-hand.glb' : 'assets/npcs/gobkit-cc0/roster/' + pack + '/' + slug(model) + '.glb',
    spawn, route, interaction: spawn.slice(), workClip: /talk|special|patrol|calculate|work|greet|cheer|bow|command|explain|serve|run/i
  });
}));

export const NPC_DISTRICT_COUNTS = Object.freeze(Object.fromEntries(
  Object.keys(ANCHORS).map(district => [district, NPC_DEFINITIONS.filter(actor => actor.district === district).length])
));

export const NPC_DISTRICT_ANCHORS = ANCHORS;
