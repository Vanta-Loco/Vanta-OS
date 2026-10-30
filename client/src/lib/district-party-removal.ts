export interface PartyRemovalMember {
  id: string;
  name: string;
}

export interface PartyRemovalParty {
  isLeader: boolean;
  leaderMemberId: string;
  members: readonly PartyRemovalMember[];
}

export function getConfirmablePartyRemoval(
  party: PartyRemovalParty | null | undefined,
  pendingMemberId: string | null,
): PartyRemovalMember | null {
  if (!party?.isLeader || !pendingMemberId || pendingMemberId === party.leaderMemberId) return null;
  return party.members.find(({ id }) => id === pendingMemberId) ?? null;
}

export function canStartPartyRemoval(
  party: PartyRemovalParty | null | undefined,
  memberId: string,
): boolean {
  return getConfirmablePartyRemoval(party, memberId) !== null;
}
