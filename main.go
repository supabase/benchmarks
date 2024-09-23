package main

import (
	"context"

	"github.com/hashicorp/go-version"
	"github.com/hashicorp/hc-install/product"
	"github.com/hashicorp/hc-install/releases"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"

	"github.com/pocketbase/pocketbase"
	"github.com/supabase/supabench/internal/execution"
	"github.com/supabase/supabench/internal/gh"
	"github.com/supabase/supabench/internal/terraform"
	_ "github.com/supabase/supabench/migrations"
	"github.com/supabase/supabench/pipelines"
)

func main() {
	viper.SetEnvPrefix("SUPABENCH")
	viper.AutomaticEnv()

	log.Logger = log.Level(zerolog.InfoLevel)

	installer := &releases.ExactVersion{
		Product: product.Terraform,
		Version: version.Must(version.NewVersion("1.2.6")),
	}

	execPath, err := installer.Install(context.Background())
	if err != nil {
		log.Fatal().Err(err).Msg("error installing Terraform")
	}

	tf := terraform.New(execPath)
	pb := pocketbase.New()
	gh := gh.New(pb)
	app := execution.New(pb, tf, gh)

	pipelines.InitRoutes(app)
	pipelines.InitUI(app)
	pipelines.InitUser(app)

	go func() {
		if err := app.NewCron(); err != nil {
			log.Fatal().Err(err).Msg("error starting cron")
		}
	}()

	if err := pb.Start(); err != nil {
		log.Fatal().Err(err)
	}
}
