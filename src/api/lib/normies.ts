import fetch from 'node-fetch';

export interface NormieTraits {
  Type: string;
  Gender: string;
  Age: string;
  'Hair Style': string;
  'Facial Feature': string;
  Eyes: string;
  Expression: string;
  Accessory: string;
}

export interface NormieMetadata {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string | number }[];
}

export class NormiesClient {
  private baseUrl = 'https://api.normies.art';

  async getNormiePixels(id: number): Promise<string> {
    const res = await fetch(`${this.baseUrl}/normie/${id}/pixels`);
    if (!res.ok) throw new Error(`Failed to fetch pixels for Normie ${id}`);
    return res.text();
  }

  async getNormieTraits(id: number): Promise<NormieTraits> {
    const res = await fetch(`${this.baseUrl}/normie/${id}/traits`);
    if (!res.ok) throw new Error(`Failed to fetch traits for Normie ${id}`);
    return res.json();
  }

  async getNormieMetadata(id: number): Promise<NormieMetadata> {
    const res = await fetch(`${this.baseUrl}/normie/${id}/metadata`);
    if (!res.ok) throw new Error(`Failed to fetch metadata for Normie ${id}`);
    return res.json();
  }

  async getNormieOwner(id: number): Promise<string> {
    const res = await fetch(`${this.baseUrl}/normie/${id}/owner`);
    if (!res.ok) throw new Error(`Failed to fetch owner for Normie ${id}`);
    const data = await res.json();
    return data.owner;
  }

  async getHoldersNormies(address: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/holders/${address}`);
    if (!res.ok) throw new Error(`Failed to fetch Normies for holder ${address}`);
    return res.json();
  }
}

export const normiesClient = new NormiesClient();
