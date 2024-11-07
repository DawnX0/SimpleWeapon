import { ReplicatedStorage, RunService, Workspace } from "@rbxts/services";

type WeaponType = {
	Name: string;
	Damage: number;
	Range: number;
	WeaponType: "Melee" | "Ranged";
	Endlag: number;
	Cooldown: number;
	ClientAttack: (model: Model) => void;
	ServerAttack: (model: Model) => void;
	Hitbox?: Part | UnionOperation | MeshPart;
	Hitstun?: boolean;
	AttackSpeed?: number;
	WeaponModel?: Model;
	WeaponAttributes?: string[];
	AttackRestrictions?: string[];
};

export interface MeleeWeaponType extends WeaponType {
	Animations: {
		Block: string;
		M1: { [key: number]: string };
		M2?: string;
		Idle?: string;
		Walk?: string;
		Jump?: string;
	};
}

export interface RangedWeaponType extends WeaponType {
	ProjectileModel: Model;
	Animations: {
		Reload: string;
		Block: string;
		M1: { [key: number]: string };
		M2?: string;
		Idle?: string;
		Walk?: string;
		Jump?: string;
	};
}

const WEAPON_FOLDER_NAME = "Weapons";

class SimpleWeapon {
	private weapons: Map<string, MeleeWeaponType | RangedWeaponType> = new Map();

	constructor() {
		this.loadWeapons();
	}

	private loadWeapons() {
		const weaponFolder = ReplicatedStorage.FindFirstChild(WEAPON_FOLDER_NAME, true);
		if (!weaponFolder) error(`No folder named "${WEAPON_FOLDER_NAME}" found in replicated storage.`);

		for (const child of weaponFolder.GetDescendants()) {
			if (child.IsA("ModuleScript")) {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const weapon = require(child) as MeleeWeaponType | RangedWeaponType;

				this.createWeapon(weapon);
			}
		}
	}

	createWeapon(weaponData: MeleeWeaponType | RangedWeaponType) {
		if (this.weapons.has(weaponData.Name.lower())) {
			error(`Skill with name "${weaponData.Name}" already exists.`);
		}
		this.weapons.set(weaponData.Name.lower(), weaponData);
	}

	getWeapon(name: string): MeleeWeaponType | RangedWeaponType | undefined {
		return this.weapons.get(name.lower());
	}

	checkRestrictions(model: Model, weaponRestrictions: string[]): boolean {
		for (const restriction of weaponRestrictions) {
			if (model.GetAttribute(restriction.lower())) {
				return true;
			}
		}
		return false;
	}

	executeServerAttack(weaponName: string, model: Model) {
		const weapon = this.weapons.get(weaponName.lower());
		if (weapon) {
			if (weapon.AttackRestrictions && this.checkRestrictions(model, weapon.AttackRestrictions)) return;

			const rootpart = model.FindFirstChild("HumanoidRootPart") as BasePart;
			if (!rootpart) error("Could not find root part");

			const humanoid = model.FindFirstChildWhichIsA("Humanoid");
			if (!humanoid) error("Could not find humanoid");

			const hitbox = weapon.Hitbox;
			if (!hitbox) {
				const defaultCFrame = rootpart.CFrame;
				const defaultSize = new Vector3(5, 5, 5);
				const defaultDirection = rootpart.CFrame.LookVector.mul(weapon.Range);
				const defaultParams = new RaycastParams();
				defaultParams.FilterDescendantsInstances = [model];
				defaultParams.FilterType = Enum.RaycastFilterType.Exclude;

				const cast = Workspace.Blockcast(defaultCFrame, defaultSize, defaultDirection, defaultParams);
				if (cast && cast.Instance) {
					print(cast.Instance.Parent);
				}
			}

			weapon.ServerAttack(model);
		}
	}

	executeClientAttack(weaponName: string, model: Model) {
		const weapon = this.getWeapon(weaponName);
		if (weapon) {
			if (weapon.AttackRestrictions && this.checkRestrictions(model, weapon.AttackRestrictions)) return;

			weapon.ClientAttack(model);
		}
	}
}

const simpleWeapon = new SimpleWeapon();
export default simpleWeapon;
