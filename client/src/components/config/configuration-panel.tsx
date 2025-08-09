import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LLMProviders from "./llm-providers";
import VectorDatabases from "./vector-databases";

export default function ConfigurationPanel() {
  const [activeConfigTab, setActiveConfigTab] = useState("llm");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">System Configuration</h2>
        <p className="text-gray-600">Configure your LLM providers, vector databases, and embedding models</p>
      </div>

      <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="llm">LLM Providers</TabsTrigger>
          <TabsTrigger value="vector">Vector Databases</TabsTrigger>
          <TabsTrigger value="embedding">Embedding Models</TabsTrigger>
          <TabsTrigger value="storage">Storage Backend</TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="mt-6">
          <LLMProviders />
        </TabsContent>

        <TabsContent value="vector" className="mt-6">
          <VectorDatabases />
        </TabsContent>

        <TabsContent value="embedding" className="mt-6">
          <div className="text-center py-12">
            <i className="fas fa-brain text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Embedding Models</h3>
            <p className="text-gray-500">Embedding configuration coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <div className="text-center py-12">
            <i className="fas fa-database text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Storage Backend</h3>
            <p className="text-gray-500">Storage configuration coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
