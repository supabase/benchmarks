package execution

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/go-co-op/gocron"
	"github.com/pocketbase/dbx"
	"github.com/rs/zerolog/log"
	"github.com/supabase/supabench/internal/gh"
	"github.com/supabase/supabench/models"
)

func (app *App) NewCron() error {
	s := gocron.NewScheduler(time.UTC)
	s.SetMaxConcurrentJobs(1, gocron.WaitMode)

	runJob, err := s.Every("15s").Do(app.runBenchmarks)
	if err != nil {
		return err
	}
	teardownJob, err := s.Every("15s").Do(app.teardownBenchmarks)
	if err != nil {
		return err
	}

	s.StartAsync()

	app.cron = s
	app.runJob = runJob
	app.teardownJob = teardownJob

	return nil
}

func (app *App) runBenchmarks() {
	if app.PB.DB() == nil {
		return
	}

	running, err := app.checkExistByStatus("running", "success", "fail")
	if err != nil {
		log.Error().Err(err).Msg("error checking if there is a running benchmark")
		return
	}

	runs, err := app.findRunsByStatus("pending")
	if err != nil {
		log.Error().Err(err).Msg("error finding pending runs")
		return
	}

	if running {
		log.Info().Int("Queue", len(runs)).Msg("there is a running benchmark, skipping")
		return
	}

	if len(runs) == 0 {
		log.Info().Msg("there are no pending benchmarks, skipping")
		return
	}

	log.Info().Int("Queue", len(runs)).Msg("found pending benchmarks")
	run := runs[0]
	log.Info().
		Str("benchmark_id", run.BenchmarkID).
		Str("run_id", run.Id).
		Str("name", run.Name).
		Msg("running benchmark")

	run.Status = "running"
	if err := app.PB.DB().Model(&run).Update("Status"); err != nil {
		log.Error().Err(err).Msg("error updating run status")
		return
	}

	if err := app.runBenchmark(&run); err != nil {
		log.Error().Err(err).Msg("error running benchmark")
		run.Status = "fail"
		if err := app.PB.DB().Model(&run).Update("Status"); err != nil {
			log.Error().Err(err).Msg("error updating run status to failed")
		}

		prLink, benchmarkRecord, ok := getPRInfo(run, app)
		if !ok {
			return
		}

		if run.Output == nil || *run.Output == "" {
			app.GH.AddOrUpdateComment(context.TODO(), prLink, gh.SmthWentWrongCommentString())
		} else {
			started, ended := setStartedEnded(run)
			gurl := *benchmarkRecord.GrafanaURL + "&from=" + started + "&to=" + ended + "&var-testrun=" + run.Name
			app.GH.AddOrUpdateComment(context.TODO(), prLink, gh.FailureCommentString(gurl, *run.Output))
		}

		return
	}

	run.Status = "success"
	if err := app.PB.DB().Model(&run).Update("Status"); err != nil {
		log.Error().Err(err).Msg("error updating run status to success")
		return
	}

	prLink, benchmarkRecord, ok := getPRInfo(run, app)
	if !ok {
		return
	}

	if run.Output == nil {
		output := ""
		run.Output = &output
	}
	started, ended := setStartedEnded(run)
	gurl := *benchmarkRecord.GrafanaURL + "&from=" + started + "&to=" + ended + "&var-testrun=" + run.Name
	app.GH.AddOrUpdateComment(context.TODO(), prLink, gh.SuccessCommentString(gurl, *run.Output))
}

func (app *App) teardownBenchmarks() {
	if app.PB.DB() == nil {
		return
	}

	running, err := app.checkExistByStatus("success", "fail")
	if err != nil {
		log.Error().Err(err).Msg("error checking if there is a benchmark that needs to be cleaned up")
		return
	}
	if !running {
		return
	}

	runs, err := app.findRunsByStatus("success", "fail")
	if err != nil {
		log.Error().Err(err).Msg("error finding runs that need to be cleaned up")
		return
	}

	if len(runs) > 1 {
		log.Error().Msg("there are more than one benchmarks that need to be cleaned up")
	}

	log.Info().Msg("found benchmarks that need to be cleaned up")
	for _, run := range runs {
		log.Info().
			Str("benchmark_id", run.BenchmarkID).
			Str("run_id", run.Id).
			Str("name", run.Name).
			Msg("teardown benchmark")

		if err := app.teardownBenchmark(&run); err != nil {
			log.Error().Err(err).Msg("error when teardown benchmark")
			run.Status = "fail"
			if err := app.PB.DB().Model(&run).Update("Status"); err != nil {
				log.Error().Err(err).Msg("error updating run status to failed")
			}
			return
		}

		if run.Status == "success" && run.StartedAt != nil && run.EndedAt != nil {
			started, ended := setStartedEnded(run)
			run.StartedAt = &started
			run.EndedAt = &ended
		}

		run.Status = "finished"
		if err := app.PB.DB().Model(&run).Update("Status", "EndedAt", "StartedAt"); err != nil {
			log.Error().Err(err).Msg("error updating run status to finished")
			return
		}
	}
}

// looks for pending runs in app.DB and returns it
func (app *App) findRunsByStatus(status ...interface{}) ([]models.Run, error) {
	var runs []models.Run
	if err := app.PB.DB().
		Select().
		Where(dbx.In("status", status...)).
		OrderBy("triggered_at").
		All(&runs); err != nil {
		return nil, err
	}

	return runs, nil
}

func (app *App) checkExistByStatus(status ...interface{}) (bool, error) {
	var runs []models.Run
	if err := app.PB.DB().
		Select().
		Where(dbx.In("status", status...)).
		All(&runs); err != nil {
		return false, err
	}

	return len(runs) > 0, nil
}

func setStartedEnded(run models.Run) (startedAt, endedAt string) {
	started, errStarted := strconv.Atoi(*run.StartedAt)
	ended, errEnded := strconv.Atoi(*run.EndedAt)

	if errStarted != nil || errEnded != nil {
		log.Warn().
			AnErr("started_err", errStarted).
			AnErr("ended_err", errEnded).
			Msg("error converting started_at and ended_at to int")
		return "", ""
	} else {
		duration := ended - started
		now := time.Now().UTC().UnixMilli()
		endedAt = fmt.Sprintf("%d", now)
		startedAt = fmt.Sprintf("%d", now-int64(duration)-30*1000)
	}
	return startedAt, endedAt
}

func getPRInfo(run models.Run, app *App) (string, models.Benchmark, bool) {
	if run.GitHubPRID == nil || *run.GitHubPRID == "" {
		return "", models.Benchmark{}, false
	}

	prLink, err := app.GH.GetPRLinkByID(*run.GitHubPRID)
	if err != nil {
		log.Warn().
			Str("benchmark_id", run.BenchmarkID).
			Str("run_id", run.Id).
			Str("name", run.Name).
			Msg("Failed to get PR link")
		return "", models.Benchmark{}, false
	}

	var benchmarkRecord models.Benchmark
	if err := app.PB.DB().
		Select("grafana_url").
		Where(dbx.HashExp{"id": run.BenchmarkID}).
		One(&benchmarkRecord); err != nil {
		log.Warn().
			Str("benchmark_id", run.BenchmarkID).
			Str("run_id", run.Id).
			Str("name", run.Name).
			Msg("Failed to get Grafana URL")
		return "", models.Benchmark{}, false
	}
	return prLink, benchmarkRecord, true
}
