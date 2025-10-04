"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AssignedCards from '@/components/AssignedCards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackButton from '@/components/ui/BackButton';
import { AssignedCardsPageClientProps } from '@/interfaces/ui-components';

export default function AssignedCardsPageClient({ team }: AssignedCardsPageClientProps) {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <BackButton label="Back to Team" className="mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Assigned Cards - {team.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View all cards assigned to team members
        </p>
      </div>

      <Tabs defaultValue="my-cards" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-cards">My Cards</TabsTrigger>
          <TabsTrigger value="team-cards">All Team Cards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-cards" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cards Assigned to Me</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignedCards teamId={team.id} currentUserOnly={true} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team-cards" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Team Assigned Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignedCards teamId={team.id} currentUserOnly={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
