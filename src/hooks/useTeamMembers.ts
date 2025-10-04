import { useState, useEffect, useCallback } from "react";
import { ContextCardService } from "@/services/contextCard.service";
import { TeamMember } from "@/interfaces/teams";

export const useTeamMembers = (projectSlug: string, open: boolean) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!projectSlug || !open) return;

      try {
        const members = await ContextCardService.fetchTeamMembers(projectSlug);
        setTeamMembers(members);
        setFilteredMembers(members);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      }
    };

    loadTeamMembers();
  }, [projectSlug, open]);

  const handleAssignmentSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredMembers(teamMembers);
      return;
    }

    const filtered = teamMembers.filter(member =>
      member.name?.toLowerCase().includes(query.toLowerCase()) ||
      member.email?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [teamMembers]);

  return {
    teamMembers,
    filteredMembers,
    showMemberDropdown,
    setShowMemberDropdown,
    handleAssignmentSearch,
  };
};
