package execution

import (
	"github.com/go-co-op/gocron"
	"github.com/pocketbase/pocketbase"
	"github.com/supabase/supabench/internal/gh"
	"github.com/supabase/supabench/internal/terraform"
)

type App struct {
	TF          *terraform.TfExec
	PB          *pocketbase.PocketBase
	GH          *gh.Client
	cron        *gocron.Scheduler
	runJob      *gocron.Job
	teardownJob *gocron.Job
}

func New(pb *pocketbase.PocketBase, tf *terraform.TfExec, gh *gh.Client) *App {
	return &App{
		TF: tf,
		PB: pb,
		GH: gh,
	}
}
