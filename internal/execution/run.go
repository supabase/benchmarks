package execution

import (
	"context"
	"encoding/json"
	"errors"
	"io/ioutil"
	"os"
	"path"

	"github.com/pocketbase/dbx"
	"github.com/rs/zerolog/log"
	"github.com/supabase/supabench/internal/archive"
	"github.com/supabase/supabench/models"
)

func (app *App) runBenchmark(run *models.Run) error {
	// unpack script
	basePath, secret, err := app.getSecretPath(run)
	if err != nil {
		return err
	}
	log.Info().Str("base_path", basePath).Msg("found script")
	if secret.Script == nil {
		return errors.New("secret script is nil, link is not supported yet")
	}

	scriptWD, err := unpack(basePath, secret)
	if err != nil {
		return err
	}

	// construct envs
	envs := getEnvs(secret.Env)
	vars := getVars(secret.Vars)
	for k, v := range getVars(run.Vars) {
		vars[k] = v
	}

	// set run meta info
	vars["benchmark_id"] = run.BenchmarkID
	vars["testrun_id"] = run.Id
	vars["testrun_name"] = run.Name
	if run.Origin != nil {
		vars["test_origin"] = *run.Origin
	}

	// tf apply to run benchmark
	return app.TF.Apply(scriptWD, envs, vars)
}

func (app *App) teardownBenchmark(run *models.Run) error {
	// unpack script
	basePath, secret, err := app.getSecretPath(run)
	if err != nil {
		return err
	}
	scriptWD := path.Join(basePath, "script_unpacked")

	// construct envs
	envs := getEnvs(secret.Env)
	vars := getVars(secret.Env)
	vars["benchmark_id"] = run.BenchmarkID
	vars["testrun_id"] = run.Id
	vars["testrun_name"] = run.Name
	if run.Origin != nil {
		vars["test_origin"] = *run.Origin
	}

	// tf apply to run benchmark
	err = app.TF.Destroy(scriptWD, envs, vars)
	if err != nil {
		return err
	}
	if err = os.RemoveAll(scriptWD); err != nil {
		log.Warn().Err(err).Msg("cannot remove script unpacked dir")
	}
	return nil
}

func (app *App) getSecretPath(run *models.Run) (string, *models.Secret, error) {
	// we need secrets collection id to get path to benchmark script
	secrets, err := app.PB.Dao().FindCollectionByNameOrId("secrets")
	if err != nil {
		return "", nil, err
	}

	// also get benchmark's secrets: id, script, envs
	var secret models.Secret
	if err := app.PB.DB().
		Select().
		Where(dbx.HashExp{"benchmark_id": run.BenchmarkID}).
		One(&secret); err != nil {
		return "", nil, err
	}

	basePath := path.Join("pb_data/storage", secrets.Id, secret.Id)
	return basePath, &secret, nil
}

func getEnvs(e *string) map[string]string {
	envs := map[string]string{}
	if e != nil {
		secrets := map[string]string{}

		err := json.Unmarshal([]byte(*e), &secrets)
		if err != nil {
			log.Warn().
				Err(errors.New("secret env is not a map[string]string")).
				Msg("cannot get env")
		} else {
			envs = secrets
		}
	}
	return envs
}

func getVars(v *string) map[string]string {
	vars := map[string]string{}
	if v != nil {
		secrets := map[string]string{}

		err := json.Unmarshal([]byte(*v), &secrets)
		if err != nil {
			log.Warn().
				Err(errors.New("secret vars is not a map[string]string")).
				Msg("cannot get vars")
		} else {
			vars = secrets
		}
	}
	return vars
}

func unpack(basePath string, secret *models.Secret) (string, error) {
	packedPath := path.Join(basePath, *secret.Script)
	// clear if exist already
	scriptWD := path.Join(basePath, "script_unpacked")
	scriptTemp := path.Join(basePath, "script_temp")
	if err := os.RemoveAll(scriptTemp); err != nil {
		return "", err
	}
	if err := os.RemoveAll(scriptWD); err != nil {
		return "", err
	}
	log.Info().Str("wd", scriptWD).Msg("unpacking script")

	// extract archive
	os.MkdirAll(scriptTemp, 0755)
	archive.Unpack(context.TODO(), packedPath, scriptTemp)

	// if content is single dir, move it to be new root dir
	paths, err := ioutil.ReadDir(scriptTemp)
	if err != nil {
		return "", err
	}
	if len(paths) == 1 && paths[0].IsDir() {
		err = os.Rename(path.Join(scriptTemp, paths[0].Name()), scriptWD)
		if err != nil {
			return "", err
		}
	} else {
		err = os.Rename(scriptTemp, scriptWD)
		if err != nil {
			return "", err
		}
	}
	log.Info().Str("new_wd", scriptWD).Msg("script moved")

	// remove temp
	if err = os.RemoveAll(scriptTemp); err != nil {
		return "", err
	}

	return scriptWD, nil
}
