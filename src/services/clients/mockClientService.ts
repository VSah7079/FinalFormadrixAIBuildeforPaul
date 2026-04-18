import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

export interface Client {
  id: ID;
  name: string;
  code: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  status: 'Active' | 'Inactive';
}

export interface IClientService {
  getAll(): Promise<ServiceResult<Client[]>>;
  getById(id: ID): Promise<ServiceResult<Client>>;
  add(client: Omit<Client, 'id'>): Promise<ServiceResult<Client>>;
  update(id: ID, changes: Partial<Omit<Client, 'id'>>): Promise<ServiceResult<Client>>;
  deactivate(id: ID): Promise<ServiceResult<Client>>;
  reactivate(id: ID): Promise<ServiceResult<Client>>;
}

// ─── Mock ─────────────────────────────────────────────────────────────────────
const SEED_CLIENTS: Client[] = [

  // ── MFT (Manchester) — UK referring hospitals & GP networks ──────────────
  { id: 'c-mft-01', name: 'Manchester Royal Infirmary',              code: 'MRI',  address: 'Oxford Road, Manchester, M13 9WL',               phone: '0161 276 1234', fax: '0161 276 1235', email: 'path.referrals@mft.nhs.uk',        status: 'Active'   },
  { id: 'c-mft-02', name: 'Wythenshawe Hospital',                    code: 'WYT',  address: 'Southmoor Road, Manchester, M23 9LT',            phone: '0161 998 7070', fax: '0161 998 7071', email: 'path@wythenshawe.nhs.uk',           status: 'Active'   },
  { id: 'c-mft-03', name: 'North Manchester General Hospital',       code: 'NMG',  address: 'Delaunays Road, Manchester, M8 5RB',             phone: '0161 720 2746', fax: '0161 720 2747', email: 'path@nmgh.nhs.uk',                  status: 'Active'   },
  { id: 'c-mft-04', name: 'Salford Royal NHS Foundation Trust',      code: 'SRF',  address: 'Stott Lane, Salford, M6 8HD',                    phone: '0161 789 7373', fax: '0161 789 7374', email: 'specimens@srft.nhs.uk',             status: 'Active'   },
  { id: 'c-mft-05', name: 'Tameside General Hospital',               code: 'TGH',  address: 'Fountain Street, Ashton-under-Lyne, OL6 9RW',    phone: '0161 331 6000', fax: '0161 331 6001', email: 'lab.referrals@tgh.nhs.uk',         status: 'Active'   },
  { id: 'c-mft-06', name: 'The Christie NHS Foundation Trust',       code: 'CHR',  address: '550 Wilmslow Road, Manchester, M20 4BX',         phone: '0161 446 3000', fax: '0161 446 3001', email: 'pathology@christie.nhs.uk',        status: 'Active'   },
  { id: 'c-mft-07', name: 'Greater Manchester GP Network',           code: 'GMG',  address: 'Piccadilly Place, Manchester, M1 3BN',            phone: '0161 214 5500', fax: '0161 214 5501', email: 'gp.specimens@gmgpnetwork.nhs.uk',  status: 'Active'   },
  { id: 'c-mft-08', name: 'Spire Manchester Hospital',               code: 'SPM',  address: '170 Barlow Moor Road, Manchester, M20 2AF',      phone: '0161 447 6700', fax: '0161 447 6701', email: 'pathology@spiremanchesterh.com',   status: 'Active'   },

  // ── MPA (Midwest Pathology Associates) — Chicago-area clients ────────────
  { id: 'c-mpa-01', name: 'Northwestern Memorial Hospital',          code: 'NWM',  address: '251 E Huron St, Chicago, IL 60611',              phone: '312-926-2000', fax: '312-926-2001', email: 'pathology@nm.org',                  status: 'Active'   },
  { id: 'c-mpa-02', name: 'Rush University Medical Center',          code: 'RUS',  address: '1653 W Congress Pkwy, Chicago, IL 60612',        phone: '312-942-5000', fax: '312-942-5001', email: 'path.referrals@rush.edu',           status: 'Active'   },
  { id: 'c-mpa-03', name: 'Advocate Illinois Masonic Medical Center',code: 'AIM',  address: '836 W Wellington Ave, Chicago, IL 60657',        phone: '773-975-1600', fax: '773-975-1601', email: 'lab@advocatehealth.com',            status: 'Active'   },
  { id: 'c-mpa-04', name: 'Henry Ford Health System',                code: 'HFH',  address: '2799 W Grand Blvd, Detroit, MI 48202',           phone: '313-916-2600', fax: '313-916-2601', email: 'sendouts@henryford.org',            status: 'Active'   },
  { id: 'c-mpa-05', name: 'Illinois Bone & Joint Institute',         code: 'IBJ',  address: '2401 Ravine Way, Glenview, IL 60025',            phone: '847-998-5680', fax: '847-998-5681', email: 'path@ibji.com',                     status: 'Active'   },
  { id: 'c-mpa-06', name: 'Midwest Center for Surgical Excellence',  code: 'MSE',  address: '60 E Delaware Pl, Chicago, IL 60611',            phone: '312-337-8100', fax: '312-337-8101', email: 'specimens@midwestsurgery.com',      status: 'Active'   },
  { id: 'c-mpa-07', name: 'DuPage Medical Group',                    code: 'DMG',  address: '1200 Kensington Rd, Oak Brook, IL 60523',        phone: '630-469-9200', fax: '630-469-9201', email: 'lab.orders@dupagemedical.com',      status: 'Active'   },
  { id: 'c-mpa-08', name: 'NorthShore University HealthSystem',      code: 'NSH',  address: '2650 Ridge Ave, Evanston, IL 60201',             phone: '847-570-2000', fax: '847-570-2001', email: 'pathology@northshore.org',          status: 'Inactive' },

  // ── HFHS (Henry Ford Health System) — Detroit-area clients ───────────────
  { id: 'c-hfhs-01', name: 'Henry Ford Macomb Hospital',             code: 'HFM',  address: '15855 19 Mile Rd, Clinton Twp, MI 48038',       phone: '586-263-2300', fax: '586-263-2301', email: 'path@hfmacomb.org',                 status: 'Active'   },
  { id: 'c-hfhs-02', name: 'Henry Ford West Bloomfield Hospital',    code: 'HFW',  address: '6777 W Maple Rd, West Bloomfield, MI 48322',    phone: '248-661-4100', fax: '248-661-4101', email: 'path@hfwb.org',                     status: 'Active'   },
  { id: 'c-hfhs-03', name: 'Detroit Medical Center',                 code: 'DMC',  address: '3990 John R St, Detroit, MI 48201',             phone: '313-745-5555', fax: '313-745-5556', email: 'pathology@dmc.org',                 status: 'Active'   },
  { id: 'c-hfhs-04', name: 'Beaumont Hospital — Royal Oak',          code: 'BRO',  address: '3601 W 13 Mile Rd, Royal Oak, MI 48073',        phone: '248-898-5000', fax: '248-898-5001', email: 'sendouts@beaumont.org',             status: 'Active'   },
  { id: 'c-hfhs-05', name: 'Midwest Pathology Associates',           code: 'MPA',  address: '200 E Illinois St, Chicago, IL 60611',          phone: '312-555-0200', fax: '312-555-0201', email: 'referrals@midwestpath.com',         status: 'Active'   },
  { id: 'c-hfhs-06', name: 'McLaren Oakland',                        code: 'MCL',  address: '50 N Perry St, Pontiac, MI 48342',              phone: '248-338-5000', fax: '248-338-5001', email: 'path@mclaren.org',                  status: 'Active'   },
  { id: 'c-hfhs-07', name: 'Michigan Urology Centre',                code: 'MUC',  address: '4160 John R St, Detroit, MI 48201',             phone: '313-745-8600', fax: '313-745-8601', email: 'specimens@michiganuro.com',         status: 'Active'   },
  { id: 'c-hfhs-08', name: 'Karmanos Cancer Institute',              code: 'KCI',  address: '4100 John R St, Detroit, MI 48201',             phone: '313-576-8600', fax: '313-576-8601', email: 'pathology@karmanos.org',            status: 'Active'   },
];

const load = () => storageGet<Client[]>('pathscribe_clients', SEED_CLIENTS);
const persist = (data: Client[]) => storageSet('pathscribe_clients', data);
let MOCK_CLIENTS: Client[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockClientService: IClientService = {
  async getAll() { await delay(); return ok([...MOCK_CLIENTS]); },

  async getById(id: ID) {
    await delay();
    const c = MOCK_CLIENTS.find(c => c.id === id);
    return c ? ok({ ...c }) : err(`Client ${id} not found`);
  },

  async add(client) {
    await delay();
    const newC: Client = { ...client, id: 'c' + Date.now() };
    MOCK_CLIENTS = [...MOCK_CLIENTS, newC];
    persist(MOCK_CLIENTS);
    return ok({ ...newC });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_CLIENTS.findIndex(c => c.id === id);
    if (idx === -1) return err(`Client ${id} not found`);
    MOCK_CLIENTS = MOCK_CLIENTS.map(c => c.id === id ? { ...c, ...changes } : c);
    persist(MOCK_CLIENTS);
    return ok({ ...MOCK_CLIENTS[idx], ...changes });
  },

  async deactivate(id) { return mockClientService.update(id, { status: 'Inactive' }); },
  async reactivate(id) { return mockClientService.update(id, { status: 'Active' }); },
};
