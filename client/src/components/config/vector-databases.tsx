import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTestVectorConnection } from "@/hooks/use-config";
import StatusIndicator from "@/components/shared/status-indicator";

interface VectorProviderConfig {
  type: string;
  name: string;
  icon: string;
  config: Record<string, any>;
  isActive: boolean;
}

const defaultProviders: VectorProviderConfig[] = [
  {
    type: 'faiss',
    name: 'FAISS',
    icon: 'fas fa-database',
    config: {
      dimension: 1536,
      indexPath: './data/faiss_index',
      indexType: 'IndexFlatIP',
      topK: 5,
    },
    isActive: true,
  },
  {
    type: 'pinecone',
    name: 'Pinecone',
    icon: 'fas fa-cloud',
    config: {
      apiKey: '',
      environment: '',
      indexName: '',
      dimension: 1536,
      topK: 5,
    },
    isActive: false,
  },
  {
    type: 'chroma',
    name: 'Chroma',
    icon: 'fas fa-circle',
    config: {
      host: 'localhost',
      port: 8000,
      collectionName: 'documents',
      ssl: false,
      dimension: 1536,
      topK: 5,
    },
    isActive: false,
  },
];

export default function VectorDatabases() {
  const [providers, setProviders] = useState<VectorProviderConfig[]>(defaultProviders);
  const { toast } = useToast();
  const { mutate: testConnection, isPending: isTestingConnection } = useTestVectorConnection();

  const updateProviderConfig = (index: number, updates: Partial<VectorProviderConfig>) => {
    setProviders(prev => prev.map((provider, i) => 
      i === index ? { ...provider, ...updates } : provider
    ));
  };

  const updateProviderConfigField = (index: number, field: string, value: any) => {
    setProviders(prev => prev.map((provider, i) => 
      i === index 
        ? { ...provider, config: { ...provider.config, [field]: value } }
        : provider
    ));
  };

  const handleTestConnection = (provider: VectorProviderConfig) => {
    testConnection(
      { provider: provider.type, config: provider.config },
      {
        onSuccess: (data) => {
          toast({
            title: "Connection Test",
            description: data.connected 
              ? `${provider.name} connection successful!`
              : `${provider.name} connection failed`,
            variant: data.connected ? "default" : "destructive",
          });
        },
        onError: (error) => {
          toast({
            title: "Connection Test Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {providers.map((provider, index) => (
        <Card key={provider.type} className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  provider.type === 'faiss' ? 'bg-indigo-600' :
                  provider.type === 'pinecone' ? 'bg-purple-600' :
                  'bg-orange-600'
                }`}>
                  <i className={`${provider.icon} text-white text-sm`}></i>
                </div>
                <CardTitle className="text-lg">{provider.name}</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <StatusIndicator 
                  status={provider.isActive ? 'success' : 'inactive'} 
                  label={provider.isActive ? 'Active' : 'Inactive'} 
                />
                <Switch
                  checked={provider.isActive}
                  onCheckedChange={(checked) => updateProviderConfig(index, { isActive: checked })}
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* FAISS specific fields */}
            {provider.type === 'faiss' && (
              <>
                <div>
                  <Label htmlFor={`${provider.type}-indexPath`}>Index Path</Label>
                  <Input
                    id={`${provider.type}-indexPath`}
                    value={provider.config.indexPath}
                    onChange={(e) => updateProviderConfigField(index, 'indexPath', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.type}-indexType`}>Index Type</Label>
                  <Select 
                    value={provider.config.indexType}
                    onValueChange={(value) => updateProviderConfigField(index, 'indexType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IndexFlatIP">IndexFlatIP</SelectItem>
                      <SelectItem value="IndexHNSWFlat">IndexHNSWFlat</SelectItem>
                      <SelectItem value="IndexIVFFlat">IndexIVFFlat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Pinecone specific fields */}
            {provider.type === 'pinecone' && (
              <>
                <div>
                  <Label htmlFor={`${provider.type}-apiKey`}>API Key</Label>
                  <Input
                    id={`${provider.type}-apiKey`}
                    type="password"
                    value={provider.config.apiKey}
                    onChange={(e) => updateProviderConfigField(index, 'apiKey', e.target.value)}
                    placeholder="Your Pinecone API key"
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.type}-environment`}>Environment</Label>
                  <Input
                    id={`${provider.type}-environment`}
                    value={provider.config.environment}
                    onChange={(e) => updateProviderConfigField(index, 'environment', e.target.value)}
                    placeholder="us-west1-gcp"
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.type}-indexName`}>Index Name</Label>
                  <Input
                    id={`${provider.type}-indexName`}
                    value={provider.config.indexName}
                    onChange={(e) => updateProviderConfigField(index, 'indexName', e.target.value)}
                    placeholder="my-index"
                  />
                </div>
              </>
            )}

            {/* Chroma specific fields */}
            {provider.type === 'chroma' && (
              <>
                <div>
                  <Label htmlFor={`${provider.type}-host`}>Host</Label>
                  <Input
                    id={`${provider.type}-host`}
                    value={provider.config.host}
                    onChange={(e) => updateProviderConfigField(index, 'host', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.type}-port`}>Port</Label>
                  <Input
                    id={`${provider.type}-port`}
                    type="number"
                    value={provider.config.port}
                    onChange={(e) => updateProviderConfigField(index, 'port', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.type}-collectionName`}>Collection Name</Label>
                  <Input
                    id={`${provider.type}-collectionName`}
                    value={provider.config.collectionName}
                    onChange={(e) => updateProviderConfigField(index, 'collectionName', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Common fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${provider.type}-dimension`}>Dimension</Label>
                <Input
                  id={`${provider.type}-dimension`}
                  type="number"
                  value={provider.config.dimension}
                  onChange={(e) => updateProviderConfigField(index, 'dimension', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor={`${provider.type}-topK`}>Top K</Label>
                <Input
                  id={`${provider.type}-topK`}
                  type="number"
                  value={provider.config.topK}
                  onChange={(e) => updateProviderConfigField(index, 'topK', parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleTestConnection(provider)}
                disabled={isTestingConnection}
              >
                <i className="fas fa-plug mr-2"></i>
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
