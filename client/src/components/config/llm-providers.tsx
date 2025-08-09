import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTestLLMConnection } from "@/hooks/use-config";
import StatusIndicator from "@/components/shared/status-indicator";

interface LLMProviderConfig {
  type: string;
  name: string;
  icon: string;
  config: Record<string, any>;
  isActive: boolean;
}

const defaultProviders: LLMProviderConfig[] = [
  {
    type: 'openai',
    name: 'OpenAI',
    icon: 'fas fa-robot',
    config: {
      apiKey: '',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2048,
    },
    isActive: true,
  },
  {
    type: 'azure-openai',
    name: 'Azure OpenAI',
    icon: 'fab fa-microsoft',
    config: {
      apiKey: '',
      endpoint: '',
      deploymentName: '',
      apiVersion: '2024-02-15-preview',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048,
    },
    isActive: false,
  },
  {
    type: 'anthropic',
    name: 'Anthropic Claude',
    icon: 'fas fa-brain',
    config: {
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      maxTokens: 2048,
    },
    isActive: false,
  },
];

export default function LLMProviders() {
  const [providers, setProviders] = useState<LLMProviderConfig[]>(defaultProviders);
  const { toast } = useToast();
  const { mutate: testConnection, isPending: isTestingConnection } = useTestLLMConnection();

  const updateProviderConfig = (index: number, updates: Partial<LLMProviderConfig>) => {
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

  const handleTestConnection = (provider: LLMProviderConfig) => {
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
                  provider.type === 'openai' ? 'bg-black' :
                  provider.type === 'azure-openai' ? 'bg-blue-600' :
                  'bg-orange-500'
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
            {/* API Key */}
            <div>
              <Label htmlFor={`${provider.type}-apiKey`} className="text-sm font-medium">
                API Key
              </Label>
              <Input
                id={`${provider.type}-apiKey`}
                type="password"
                value={provider.config.apiKey}
                onChange={(e) => updateProviderConfigField(index, 'apiKey', e.target.value)}
                placeholder={provider.type === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
              />
            </div>

            {/* Azure OpenAI specific fields */}
            {provider.type === 'azure-openai' && (
              <>
                <div>
                  <Label htmlFor={`${provider.type}-endpoint`}>Endpoint</Label>
                  <Input
                    id={`${provider.type}-endpoint`}
                    type="url"
                    value={provider.config.endpoint}
                    onChange={(e) => updateProviderConfigField(index, 'endpoint', e.target.value)}
                    placeholder="https://your-resource.openai.azure.com/"
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.type}-deploymentName`}>Deployment Name</Label>
                  <Input
                    id={`${provider.type}-deploymentName`}
                    value={provider.config.deploymentName}
                    onChange={(e) => updateProviderConfigField(index, 'deploymentName', e.target.value)}
                    placeholder="gpt-4-deployment"
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.type}-apiVersion`}>API Version</Label>
                  <Select 
                    value={provider.config.apiVersion}
                    onValueChange={(value) => updateProviderConfigField(index, 'apiVersion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-02-15-preview">2024-02-15-preview</SelectItem>
                      <SelectItem value="2023-12-01-preview">2023-12-01-preview</SelectItem>
                      <SelectItem value="2023-10-01-preview">2023-10-01-preview</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Model Selection */}
            <div>
              <Label htmlFor={`${provider.type}-model`}>Model</Label>
              <Select 
                value={provider.config.model}
                onValueChange={(value) => updateProviderConfigField(index, 'model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {provider.type === 'openai' && (
                    <>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="gpt-4">gpt-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                    </>
                  )}
                  {provider.type === 'azure-openai' && (
                    <>
                      <SelectItem value="gpt-4">gpt-4</SelectItem>
                      <SelectItem value="gpt-35-turbo">gpt-35-turbo</SelectItem>
                    </>
                  )}
                  {provider.type === 'anthropic' && (
                    <>
                      <SelectItem value="claude-sonnet-4-20250514">claude-sonnet-4-20250514</SelectItem>
                      <SelectItem value="claude-3-sonnet-20240229">claude-3-sonnet-20240229</SelectItem>
                      <SelectItem value="claude-3-haiku-20240307">claude-3-haiku-20240307</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Temperature and Max Tokens */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${provider.type}-temperature`}>Temperature</Label>
                <Input
                  id={`${provider.type}-temperature`}
                  type="number"
                  step="0.1"
                  min="0"
                  max={provider.type === 'anthropic' ? "1" : "2"}
                  value={provider.config.temperature}
                  onChange={(e) => updateProviderConfigField(index, 'temperature', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor={`${provider.type}-maxTokens`}>Max Tokens</Label>
                <Input
                  id={`${provider.type}-maxTokens`}
                  type="number"
                  value={provider.config.maxTokens}
                  onChange={(e) => updateProviderConfigField(index, 'maxTokens', parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleTestConnection(provider)}
                disabled={isTestingConnection || !provider.config.apiKey}
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
