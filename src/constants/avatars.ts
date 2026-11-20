import managerArifAvatar from '../assets/images/avatar_manager_arif_1794550753795.jpg';
import employeeSitiAvatar from '../assets/images/avatar_employee_siti_1794550755047.jpg';
import employeeBudiAvatar from '../assets/images/avatar_employee_budi_1794550755074.jpg';

export const AVATAR_KEYS = {
  MANAGER_ARIF: 'avatar:arif',
  EMPLOYEE_SITI: 'avatar:siti',
  EMPLOYEE_BUDI: 'avatar:budi',
} as const;

const AVATAR_MAP: Record<string, string> = {
  [AVATAR_KEYS.MANAGER_ARIF]: managerArifAvatar,
  [AVATAR_KEYS.EMPLOYEE_SITI]: employeeSitiAvatar,
  [AVATAR_KEYS.EMPLOYEE_BUDI]: employeeBudiAvatar,
};

export function resolveAvatarUrl(avatarKeyOrUrl: string): string {
  if (!avatarKeyOrUrl) return employeeSitiAvatar;
  return AVATAR_MAP[avatarKeyOrUrl] ?? avatarKeyOrUrl;
}
