import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import torch_geometric.nn as pyg_nn
from typing import List

# Setup FastAPI for GNN Inference
app = FastAPI(title="PRAMAANIK GNN Inference Service", description="RGCN-based anomaly detection")

# Model definitions (simplified placeholder for Hackathon demo)
class RGCNModel(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels, num_relations):
        super().__init__()
        self.conv1 = pyg_nn.RGCNConv(in_channels, hidden_channels, num_relations)
        self.conv2 = pyg_nn.RGCNConv(hidden_channels, out_channels, num_relations)

    def forward(self, x, edge_index, edge_type):
        x = self.conv1(x, edge_index, edge_type).relu()
        x = self.conv2(x, edge_index, edge_type)
        return torch.sigmoid(x)

# Placeholder loaded model
model = RGCNModel(in_channels=16, hidden_channels=32, out_channels=1, num_relations=5)
# model.load_state_dict(torch.load("model.pt"))
model.eval()

class TransactionGraph(BaseModel):
    tx_id: str
    nodes: List[List[float]]
    edge_index: List[List[int]]
    edge_type: List[int]

@app.post("/predict")
def predict_anomaly(graph: TransactionGraph):
    try:
        x = torch.tensor(graph.nodes, dtype=torch.float)
        edge_index = torch.tensor(graph.edge_index, dtype=torch.long)
        edge_type = torch.tensor(graph.edge_type, dtype=torch.long)
        
        with torch.no_grad():
            out = model(x, edge_index, edge_type)
            
        # Target node is assumed to be index 0
        risk_score = float(out[0].item())
        basis_points = int(risk_score * 10000)
        
        # Trigger EZKL prover asynchronously here (placeholder)
        
        return {
            "tx_id": graph.tx_id,
            "risk_score_bp": basis_points,
            "explanation": "High graph density indicating circular fund flow pattern."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
