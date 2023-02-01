package terraform

import (
	"context"
	"fmt"

	"github.com/hashicorp/terraform-exec/tfexec"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

type TfExec struct {
	execPath string
	opts     Options
}

type Options struct {
	SupabenchToken string
	SupabenchURI   string

	FlyAccessToken string

	PrivateKeyLocation string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
}

type tfLog struct {
	cmd string
}

func (t *tfLog) Printf(format string, v ...interface{}) {
	log.Debug().Str("cmd", t.cmd).Msgf(format, v...)
}

func New(path string) *TfExec {
	return &TfExec{
		execPath: path,
		opts: Options{
			SupabenchToken:     viper.GetString("TOKEN"),
			SupabenchURI:       viper.GetString("URI"),
			FlyAccessToken:     viper.GetString("FLY_TOKEN"),
			PrivateKeyLocation: viper.GetString("PRIVATE_KEY_LOCATION"),
			AWSAccessKeyID:     viper.GetString("AWS_ACCESS_KEY_ID"),
			AWSSecretAccessKey: viper.GetString("AWS_SECRET_ACCESS_KEY"),
		},
	}
}

func (tf *TfExec) Apply(wd string, envs, benchVars map[string]string) error {
	exec, err := tfexec.NewTerraform(wd, tf.execPath)
	if err != nil {
		return err
	}

	log.Info().Str("path", wd).Msg("init terraform")
	if err = exec.Init(context.Background(), tfexec.Upgrade(true)); err != nil {
		return err
	}
	if err = exec.SetEnv(tf.enrichEnv(envs)); err != nil {
		return err
	}
	vars := []tfexec.ApplyOption{}
	for k, v := range tf.enrichVars(benchVars) {
		vars = append(vars, tfexec.Var(fmt.Sprintf("%s=%s", k, v)))
	}

	log.Info().Str("path", wd).Msg("applying terraform")
	logger := tfLog{
		cmd: "terraform apply",
	}
	exec.SetLogger(&logger)
	// exec.SetStderr(os.Stderr)
	// exec.SetStdout(os.Stdout)
	vars = append(vars, tfexec.Parallelism(25))
	return exec.Apply(context.Background(), vars...)
}

func (tf *TfExec) Destroy(wd string, envs, benchVars map[string]string) error {
	exec, err := tfexec.NewTerraform(wd, tf.execPath)
	if err != nil {
		return err
	}

	if err = exec.SetEnv(tf.enrichEnv(envs)); err != nil {
		return err
	}
	vars := []tfexec.DestroyOption{}
	for k, v := range tf.enrichVars(benchVars) {
		vars = append(vars, tfexec.Var(fmt.Sprintf("%s=%s", k, v)))
	}

	log.Info().Str("path", wd).Msg("destroying terraform")
	logger := tfLog{
		cmd: "terraform destroy",
	}
	exec.SetLogger(&logger)
	// exec.SetStderr(os.Stderr)
	// exec.SetStdout(os.Stdout)
	vars = append(vars, tfexec.Parallelism(25))
	return exec.Destroy(context.Background(), vars...)
}

func (tf *TfExec) enrichVars(vars map[string]string) map[string]string {
	vars["fly_access_token"] = tf.opts.FlyAccessToken

	vars["private_key_location"] = tf.opts.PrivateKeyLocation

	vars["supabench_token"] = tf.opts.SupabenchToken
	vars["supabench_uri"] = tf.opts.SupabenchURI
	return vars
}

func (tf *TfExec) enrichEnv(env map[string]string) map[string]string {
	env["AWS_ACCESS_KEY_ID"] = tf.opts.AWSAccessKeyID
	env["AWS_SECRET_ACCESS_KEY"] = tf.opts.AWSSecretAccessKey
	env["SUPABENCH_TOKEN"] = tf.opts.SupabenchToken
	env["SUPABENCH_URI"] = tf.opts.SupabenchURI

	return env
}
