export type CountyOption = {
  id: number;
  name: string;
};

export type TownOption = {
  id: number;
  countyId: number;
  name: string;
};

export type AreaOption = {
  id: number;
  townId: number;
  name: string;
};

export type LocationCatalog = {
  counties: CountyOption[];
  towns: TownOption[];
  areas: AreaOption[];
};

export type CreateManagedLocationInput = {
  countyId: number;
  townId?: number;
  townName?: string;
  areaName: string;
};

export type ManagedLocationRecord = {
  county: CountyOption;
  town: TownOption;
  area: AreaOption;
};
