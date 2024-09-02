package models

import (
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/tools/types"
)

type Run struct {
	models.BaseModel
	BenchmarkID string         `json:"benchmark_id"`
	Name        string         `json:"name"`
	Origin      *string        `json:"origin"`
	Status      string         `json:"status" omitempty:"true"`
	StartedAt   *string        `json:"started_at"`
	EndedAt     *string        `json:"ended_at"`
	Output      *string        `json:"output"`
	TriggeredAt types.DateTime `json:"triggered_at"`
	Errors      *string        `json:"errors" omitempty:"true"`
	Meta        *string        `json:"meta" omitempty:"true"`
	Raw         *string        `json:"raw" omitempty:"true"`
	Comment     *string        `json:"comment" omitempty:"true"`
	Vars        *string        `json:"vars" omitempty:"true"`
	GitHubPRID  *string        `json:"github_pr_id" omitempty:"true"`
}

func (r Run) TableName() string {
	return "runs"
}

type Secret struct {
	models.BaseModel
	Script     *string `json:"script" omitempty:"true"`
	ScriptLink *string `json:"script_link" omitempty:"true"`
	Env        *string `json:"env" omitempty:"true"`
	Vars       *string `json:"vars" omitempty:"true"`
}

func (s Secret) TableName() string {
	return "secrets"
}

type PR struct {
	models.BaseModel
	PRLink        *string `json:"pr_link" omitempty:"true"`
	GHComment     *string `json:"gh_comment" omitempty:"true"`
	GHCommentLink *string `json:"gh_comment_link" omitempty:"true"`
}

func (p PR) TableName() string {
	return "github_prs"
}

type Benchmark struct {
	models.BaseModel
	OwnerID           string  `json:"owner_id"`
	ProjectID         string  `json:"project_id"`
	Name              string  `json:"name"`
	Slug              string  `json:"slug"`
	GrafanaURL        *string `json:"grafana_url,omitempty"`
	DefaultOrigin     *string `json:"default_origin,omitempty"`
	ExtractMetricPath *string `json:"extract_metric_path,omitempty"`
	Meta              *string `json:"meta,omitempty"`
}

func (b Benchmark) TableName() string {
	return "benchmarks"
}
